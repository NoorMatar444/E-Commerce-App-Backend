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

  private async getPopulatedCart(userId: Types.ObjectId) {
    return this.cartRepo.findOne({
      filter: { user: userId },
      populate: { path: 'items.product' },
    });
  }

  async getUserCart(user: IHUser) {
    await this.getOrCreateCart(user);

    return this.getPopulatedCart(user._id);
  }

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

    if (newQuantity > product.stock) {
      throw new BadRequestException(
        `Not enough stock for product ${product.name}`,
      );
    }

    if (existingItem) {
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

    await this.cartRepo.findOneAndUpdate({
      filter: { user: user._id },
      update: { $pull: { items: { product: productId } } },
    });

    return this.getPopulatedCart(user._id);
  }

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

  async checkout(
    user: IHUser,
    paymentMethod: PaymentMethod,
  ): Promise<OrderDocument> {
    const cart = await this.getOrCreateCart(user);

    if (!cart.items.length) {
      throw new BadRequestException('cart is empty');
    }

    const cartSnapshot = cart.items.map((item) => ({
      product: item.product.toString(),
      quantity: item.quantity,
    }));

    const uniqueProductIds = [
      ...new Set(cartSnapshot.map((item) => item.product)),
    ];

    const products = await this.productRepo.findAll({
      filter: {
        _id: { $in: uniqueProductIds },
        isActive: true,
      },
    });

    if (products.length !== uniqueProductIds.length) {
      throw new NotFoundException('One or more products not found');
    }

    for (const item of cartSnapshot) {
      const product = products.find(
        (entry) => entry._id.toString() === item.product,
      );

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      if (product.stock < item.quantity) {
        throw new BadRequestException(
          `Not enough stock for product ${product.name}`,
        );
      }
    }

    await this.cartRepo.findOneAndUpdate({
      filter: { user: user._id },
      update: { $set: { items: [] } },
    });

    const orderBody: CreateOrderDto = {
      items: cartSnapshot,
      paymentMethod,
    };

    try {
      return await this.orderService.createOrder(orderBody, user);
    } catch (error) {
      await this.cartRepo.findOneAndUpdate({
        filter: { user: user._id },
        update: {
          $set: {
            items: cartSnapshot.map((item) => ({
              product: item.product,
              quantity: item.quantity,
            })),
          },
        },
      });
      throw error;
    }
  }
}
