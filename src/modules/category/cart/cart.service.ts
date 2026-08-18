import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { CartRepo } from 'src/Rebo/cart.repo';
import { ProductRepo } from 'src/Rebo/product.repo';
import { CartDocument } from 'src/models/cart.model';
import { OrderDocument } from 'src/models/order.model';
import { IHUser } from 'src/models/user.model';
import { OrderService } from '../../order/order.service';
import { CreateOrderDto } from '../../order/order.dto';
import { PaymentMethod } from 'src/common/enums/order.enum';

@Injectable()
export class CartService {
  constructor(
    private readonly cartRepo: CartRepo,
    private readonly productRepo: ProductRepo,
    private readonly orderService: OrderService,
  ) {}

  // Finds the user's cart or creates a new empty one.
  private async getOrCreateCart(user: IHUser): Promise<CartDocument> {
    const cart = await this.cartRepo.findOne({
      filter: { user: user._id },
    });

    if (cart) {
      return cart;
    }

    return (await this.cartRepo.create({
      data: {
        user: user._id,
        items: [],
      },
    })) as CartDocument;
  }

  // Returns the cart with product details attached to each item.
  private async getPopulatedCart(userId: Types.ObjectId) {
    const carts = await this.cartRepo.findAll({
      filter: { user: userId },
      populate: { path: 'items.product' },
    });

    return carts[0];
  }
  // Returns the user's cart with product details populated.
  // Creates an empty cart first if the user does not have one yet.
  async getUserCart(user: IHUser) {
    await this.getOrCreateCart(user);

    return this.getPopulatedCart(user._id);
  }

  // Adds a product to the cart or increases quantity if it already exists.
  async addToCart(user: IHUser, productId: string, quantity: number) {
    const product = await this.productRepo.findOne({
      filter: { _id: productId, isActive: true },
    });
    if (!product) {
      throw new NotFoundException("product doesn't exist");
    }

    const cart = await this.getOrCreateCart(user);
    const existingItem = cart.items.find(
      (item) => item.product.toString() === productId,
    );
    const newQuantity = (existingItem?.quantity ?? 0) + quantity;

    // Always validate against live stock from the product document.
    if (newQuantity > product.stock) {
      throw new BadRequestException(
        `Not enough stock for product ${product.name}`,
      );
    }

    if (existingItem) {
      // Positional $ updates the matched item inside the items array.
      await this.cartRepo.findOneAndUpdate({
        filter: { user: user._id, 'items.product': productId },
        update: { $set: { 'items.$.quantity': newQuantity } },
      });
    } else {
      await this.cartRepo.findOneAndUpdate({
        filter: { user: user._id },
        update: { $push: { items: { product: productId, quantity } } },
      });
    }

    return this.getPopulatedCart(user._id);
  }

  // Sets a new quantity for one cart item.
  // If quantity is 0 or less, the item is removed instead.
  async updateCartItemQuantity(
    user: IHUser,
    productId: string,
    quantity: number,
  ) {
    if (quantity <= 0) {
      return this.removeFromCart(user, productId);
    }

    const cart = await this.getOrCreateCart(user);
    const existingItem = cart.items.find(
      (item) => item.product.toString() === productId,
    );
    if (!existingItem) {
      throw new NotFoundException("item doesn't exist in cart");
    }

    const product = await this.productRepo.findOne({
      filter: { _id: productId, isActive: true },
    });
    if (!product) {
      throw new NotFoundException("product doesn't exist");
    }

    if (quantity > product.stock) {
      throw new BadRequestException(
        `Not enough stock for product ${product.name}`,
      );
    }

    await this.cartRepo.findOneAndUpdate({
      filter: { user: user._id, 'items.product': productId },
      update: { $set: { 'items.$.quantity': quantity } },
    });

    return this.getPopulatedCart(user._id);
  }

  // Removes one product from the user's cart.
  async removeFromCart(user: IHUser, productId: string) {
    const cart = await this.cartRepo.findOne({
      filter: { user: user._id },
    });
    if (!cart) {
      throw new NotFoundException('cart not found');
    }

    const existingItem = cart.items.find(
      (item) => item.product.toString() === productId,
    );
    if (!existingItem) {
      throw new NotFoundException("item doesn't exist in cart");
    }

    // $pull removes array entries that match the given condition.
    await this.cartRepo.findOneAndUpdate({
      filter: { user: user._id },
      update: { $pull: { items: { product: productId } } },
    });

    return this.getPopulatedCart(user._id);
  }

  // Empties all items from the user's cart.
  async clearCart(user: IHUser) {
    const cart = await this.cartRepo.findOne({
      filter: { user: user._id },
    });
    if (!cart) {
      throw new NotFoundException('cart not found');
    }

    await this.cartRepo.findOneAndUpdate({
      filter: { user: user._id },
      update: { $set: { items: [] } },
    });

    return this.getPopulatedCart(user._id);
  }

  // Converts the current cart into an order, then clears the cart.
  // Reuses OrderService so stock checks, totals, and events stay in one place.
  async checkout(
    user: IHUser,
    paymentMethod: PaymentMethod,
  ): Promise<OrderDocument> {
    const cart = await this.getOrCreateCart(user);

    if (!cart.items.length) {
      throw new BadRequestException('cart is empty');
    }

    const productIds = cart.items.map((item) => item.product);
    const products = await this.productRepo.findAll({
      filter: {
        _id: { $in: productIds },
        isActive: true,
      },
    });

    if (products.length !== productIds.length) {
      throw new NotFoundException('One or more products not found');
    }

    // Build the same payload shape expected by OrderService.createOrder.
    // Price always comes from the product document, never from the cart.
    const items = cart.items.map((item) => {
      const product = products.find(
        (entry) => entry._id.toString() === item.product.toString(),
      );

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      if (product.stock < item.quantity) {
        throw new BadRequestException(
          `Not enough stock for product ${product.name}`,
        );
      }

      return {
        product: item.product.toString(),
        quantity: item.quantity,
        price: product.price,
      };
    });

    const orderBody: CreateOrderDto = { items, paymentMethod };
    const order = (await this.orderService.createOrder(
      orderBody,
      user,
    )) as OrderDocument;

    await this.clearCart(user);

    return order;
  }
}
