import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateOrderDto } from './order.dto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderRepo } from 'src/Rebo/order.repo';
import { ProductRepo } from 'src/Rebo/product.repo';
import { OrderStatus } from 'src/common/enums/order.enum';
import { IHUser } from 'src/models/user.model';
import { OrderCreatedEvent } from 'src/common/events/orders/order-created.event';

@Injectable()
export class OrderService {
  constructor(
    private readonly orderRepo: OrderRepo,
    private readonly productRepo: ProductRepo,
    private readonly eventEmitter: EventEmitter2,
  ) {}
  async createOrder(body: CreateOrderDto, user: IHUser) {
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

    // 6. Create the order
    const [order] = await this.orderRepo.create({
      data: {
        user: user._id,
        ...body,
        status: OrderStatus.PENDING,
        totalAmount,
      },
    });
    this.eventEmitter.emit(
      'order.created',
      new OrderCreatedEvent(order._id, user._id),
    );
    // 7. Return the created order
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
}
