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
    // 1. Get product IDs from the order items
    const productIds = body.items.map((item) => item.product);

    // 2. Get the real products from the database
    const products = await this.productRepo.findAll({
      filter: {
        _id: { $in: productIds },
      },
    });

    // 3. Make sure all requested products exist
    if (products.length !== productIds.length) {
      throw new NotFoundException('One or more products not found');
    }

    // 4. Calculate the total using prices from the database
    const totalAmount = body.items.reduce((total, item) => {
      const product = products.find(
        (product) => product._id.toString() === item.product.toString(),
      );

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      // 5. Check stock
      if (product.stock < item.quantity) {
        throw new BadRequestException(
          `Not enough stock for product ${product.name}`,
        );
      }

      return total + item.quantity * product.price;
    }, 0);

    // 6. Take the units out of stock before the order exists, so two checkouts
    // racing for the last unit cannot both succeed
    await this.reserveStock(body.items);

    // 7. Create the order. Only the write is guarded, because once the order
    // exists the reserved units belong to it and must not be given back.
    let order: OrderDocument;

    try {
      order = (await this.orderRepo.create({
        data: {
          user: user._id,
          ...body,
          status: OrderStatus.PENDING,
          totalAmount,
        },
      })) as OrderDocument;
    } catch (error) {
      await this.releaseStock(body.items);
      throw error;
    }

    // Announce order creation — OrderCreatedListener will create a notification
    // OrderService does NOT know about notifications, socket, or email
    this.eventEmitter.emit(
      'order.created', // must match @OnEvent('order.created') in OrderCreatedListener
      new OrderCreatedEvent(order._id, user._id),
    );
    // 8. Return the created order
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
    });

    // Comparing against the previous status keeps a repeated cancel from
    // returning the same units to stock twice
    if (
      status === OrderStatus.CANCELLED &&
      order.status !== OrderStatus.CANCELLED
    ) {
      await this.releaseStock(order.items);
    }

    this.eventEmitter.emit(
      'order.status.updated', // must match @OnEvent('order.status.updated')
      new OrderStatusUpdatedEvent(
        updatedOrder!._id,
        updatedOrder!.user,
        status,
      ),
    );

    return updatedOrder;
  }
  async getAllOrders(page: number, limit: number) {
    const orders = await this.orderRepo.findAll({
      filter: {},
      options: {
        skip: (page - 1) * limit,
        limit,
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

    let event;
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
