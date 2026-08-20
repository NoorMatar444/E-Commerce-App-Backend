import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateOrderDto } from './order.dto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { OrderRepo } from 'src/Rebo/order.repo';
import { ProductRepo } from 'src/Rebo/product.repo';
import { OrderStatus, PaymentMethod } from 'src/common/enums/order.enum';
import { IHUser } from 'src/models/user.model';
import { OrderDocument } from 'src/models/order.model';
import { OrderCreatedEvent } from 'src/common/events/orders/order-created.event';
import { OrderStatusUpdatedEvent } from 'src/common/events/orders/order-status-updated.event';
import { StripeService } from 'src/common/Services/stripe.service';
import Stripe from 'stripe';

// Shared by the DTO items (product as string) and the stored order items
// (product as ObjectId), both of which drive stock movements.
type StockChange = {
  product: Types.ObjectId | string;
  quantity: number;
};

@Injectable()
export class OrderService {
  constructor(
    private readonly orderRepo: OrderRepo,
    private readonly productRepo: ProductRepo,
    // Injected global event bus — used to announce order events without importing NotificationModule
    private readonly eventEmitter: EventEmitter2,
    private readonly stripeService: StripeService,
  ) {}
  async createOrder(
    body: CreateOrderDto,
    user: IHUser,
  ): Promise<OrderDocument> {
    const quantityByProduct = new Map<string, number>();

    for (const item of body.items) {
      const productId = item.product.toString();
      quantityByProduct.set(
        productId,
        (quantityByProduct.get(productId) ?? 0) + item.quantity,
      );
    }

    const uniqueProductIds = [...quantityByProduct.keys()];

    const products = await this.productRepo.findAll({
      filter: {
        _id: { $in: uniqueProductIds },
        isActive: true,
      },
    });

    if (products.length !== uniqueProductIds.length) {
      throw new NotFoundException('One or more products not found');
    }

    const orderItems = uniqueProductIds.map((productId) => {
      const product = products.find(
        (entry) => entry._id.toString() === productId,
      );

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      const quantity = quantityByProduct.get(productId)!;

      if (product.stock < quantity) {
        throw new BadRequestException(
          `Not enough stock for product ${product.name}`,
        );
      }

      return {
        product: product._id,
        quantity,
        price: product.price,
      };
    });

    const totalAmount = orderItems.reduce(
      (total, item) => total + item.quantity * item.price,
      0,
    );

    const stockChanges: StockChange[] = orderItems.map((item) => ({
      product: item.product,
      quantity: item.quantity,
    }));

    await this.reserveStock(stockChanges);

    const initialStatus =
      body.paymentMethod === PaymentMethod.cash
        ? OrderStatus.CONFIRMED
        : OrderStatus.PENDING;

    let order: OrderDocument;

    try {
      order = await this.orderRepo.create({
        data: {
          user: user._id,
          items: orderItems,
          paymentMethod: body.paymentMethod,
          status: initialStatus,
          totalAmount,
        },
      });
    } catch (error) {
      await this.releaseStock(stockChanges);
      throw error;
    }

    this.eventEmitter.emit(
      'order.created',
      new OrderCreatedEvent(order._id, user._id),
    );

    if (initialStatus === OrderStatus.CONFIRMED) {
      this.eventEmitter.emit(
        'order.status.updated',
        new OrderStatusUpdatedEvent(
          order._id,
          user._id,
          OrderStatus.CONFIRMED,
        ),
      );
    }

    return order;
  }

  async getUserOrders(user: IHUser) {
    const orders = await this.orderRepo.findAll({
      filter: {
        user: user._id,
      },
      populate: [
        {
          path: 'items.product',
        },
      ],
    });

    return orders;
  }

  async getOrderById(orderId: string, user: IHUser) {
    const order = await this.orderRepo.findOne({
      filter: {
        _id: orderId,
        user: user._id,
      },
      populate: [
        {
          path: 'items.product',
        },
      ],
    });
    if (!order) {
      throw new NotFoundException('order not found');
    }
    return order;
  }
  async cancelOrder(orderId: string, user: IHUser) {
    const order = await this.orderRepo.findOneAndUpdate({
      filter: {
        _id: orderId,
        user: user._id,
        status: OrderStatus.PENDING,
      },
      update: {
        status: OrderStatus.CANCELLED,
      },
    });
    if (!order) {
      throw new BadRequestException("order can't be cancelled");
    }

    // The filter above only matches a PENDING order, so this runs at most once
    // per order and cannot inflate stock on a repeated cancel
    await this.releaseStock(order.items);

    // Same event as updateOrderStatus — one listener handles all status changes
    this.eventEmitter.emit(
      'order.status.updated',
      new OrderStatusUpdatedEvent(order._id, order.user, OrderStatus.CANCELLED),
    );

    return order;
  }
  async updateOrderStatus(orderId: string, status: OrderStatus) {
    const order = await this.orderRepo.findOne({
      filter: {
        _id: orderId,
      },
    });
    if (!order) {
      throw new NotFoundException('order not exist');
    }
    if (order.status === OrderStatus.DELIVERED) {
      throw new BadRequestException('status can not be changed');
    }
    const updatedOrder = await this.orderRepo.findOneAndUpdate({
      filter: {
        _id: orderId,
      },
      update: {
        status: status,
      },
      options: { new: true },
    });

    if (!updatedOrder) {
      throw new NotFoundException('order not exist');
    }

    // Comparing against the previous status keeps a repeated cancel from
    // returning the same units to stock twice
    if (
      status === OrderStatus.CANCELLED &&
      order.status !== OrderStatus.CANCELLED
    ) {
      await this.releaseStock(order.items);
    }

    this.eventEmitter.emit(
      'order.status.updated',
      new OrderStatusUpdatedEvent(
        updatedOrder._id,
        updatedOrder.user,
        status,
      ),
    );

    return updatedOrder;
  }
  async getAllOrders(page = 1, limit = 10) {
    const safePage = Number(page) > 0 ? Number(page) : 1;
    const safeLimit = Number(limit) > 0 ? Number(limit) : 10;

    const orders = await this.orderRepo.findAll({
      filter: {},
      options: {
        skip: (safePage - 1) * safeLimit,
        limit: safeLimit,
      },
    });
    return orders;
  }

  // Mongo runs as a single node here, so transactions are unavailable. Each item
  // is decremented on its own and anything already taken is put back if a later
  // item cannot be satisfied.
  private async reserveStock(items: StockChange[]) {
    const reserved: StockChange[] = [];

    for (const item of items) {
      // Matching on stock inside the filter makes the check and the decrement a
      // single operation, so a concurrent order cannot slip in between them
      const result = await this.productRepo.updateOne({
        filter: {
          _id: item.product,
          stock: { $gte: item.quantity },
        },
        update: {
          $inc: { stock: -item.quantity },
        },
      });

      if (result.modifiedCount === 0) {
        await this.releaseStock(reserved);

        const product = await this.productRepo.findOne({
          filter: { _id: item.product },
        });

        throw new BadRequestException(
          `Not enough stock for product ${product?.name ?? item.product.toString()}`,
        );
      }

      reserved.push(item);
    }
  }

  private async releaseStock(items: StockChange[]) {
    await Promise.all(
      items.map((item) =>
        this.productRepo.updateOne({
          filter: { _id: item.product },
          update: {
            $inc: { stock: item.quantity },
          },
        }),
      ),
    );
  }

  // Starts Stripe Checkout for a pending card order and returns the hosted payment URL
  async checkoutWithStripe(orderId: string, user: IHUser) {
    const order = await this.orderRepo.findOne({
      filter: {
        _id: orderId,
        user: user._id,
        status: OrderStatus.PENDING,
        paymentMethod: PaymentMethod.card,
      },
    });

    if (!order) {
      throw new NotFoundException('Payable order not found');
    }

    // Product names live on the Product collection, not on the order snapshot
    await order.populate('items.product');

    const session = await this.stripeService.createCheckoutSession({
      customer_email: user.email,
      // metadata comes back on the webhook so we can find this order again
      metadata: {
        orderId: order._id.toString(),
      },
      line_items: order.items.map((item) => {
        const product = item.product as unknown as { name?: string };

        if (!product?.name) {
          throw new BadRequestException('Order product details are missing');
        }

        return {
          price_data: {
            currency: 'egp',
            product_data: {
              name: product.name,
            },
            // Stripe amounts are in the smallest currency unit (piastres for EGP)
            unit_amount: Math.round(item.price * 100),
          },
          quantity: item.quantity,
        };
      }),
    });

    await this.orderRepo.updateOne({
      filter: { _id: order._id },
      update: { stripeSessionId: session.id },
    });

    return { url: session.url };
  }

  // Stripe calls this after payment. Never mark an order paid from the success URL.
  async handleStripeWebhook(rawBody: Buffer | undefined, signature?: string) {
    if (!rawBody || !signature) {
      throw new BadRequestException(
        'Missing Stripe webhook payload or signature',
      );
    }

    let event: Stripe.Event;
    try {
      event = this.stripeService.constructEvent(rawBody, signature);
    } catch {
      throw new BadRequestException('Invalid Stripe webhook signature');
    }

    if (event.type !== 'checkout.session.completed') {
      return { received: true };
    }

    const session = event.data.object;
    const orderId = session.metadata?.orderId;

    if (!orderId || session.payment_status !== 'paid') {
      return { received: true };
    }

    const order = await this.orderRepo.findOne({
      filter: { _id: orderId },
    });

    if (!order || order.status !== OrderStatus.PENDING) {
      // Already confirmed (or cancelled) — webhook retries must stay idempotent
      return { received: true };
    }

    const expectedAmount = Math.round(order.totalAmount * 100);
    if (session.amount_total !== expectedAmount) {
      console.error(
        `Stripe amount mismatch for order ${orderId}: expected ${expectedAmount}, got ${session.amount_total}`,
      );
      return { received: true };
    }

    const updatedOrder = await this.orderRepo.findOneAndUpdate({
      filter: {
        _id: orderId,
        status: OrderStatus.PENDING,
      },
      update: {
        status: OrderStatus.CONFIRMED,
        stripeSessionId: session.id,
      },
    });

    if (updatedOrder) {
      this.eventEmitter.emit(
        'order.status.updated',
        new OrderStatusUpdatedEvent(
          updatedOrder._id,
          updatedOrder.user,
          OrderStatus.CONFIRMED,
        ),
      );
    }

    return { received: true };
  }
}
