import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { IHUser } from 'src/models/user.model';
import { IHNotification } from 'src/models/notification.model';
import { NotificationRepo } from 'src/Rebo/notification.repo';
import { NotificationDto } from './notification.dto';
import { OrderCreatedEvent } from 'src/common/events/orders/order-created.event';
import { OrderStatusUpdatedEvent } from 'src/common/events/orders/order-status-updated.event';
import { NotificationCreatedEvent } from 'src/common/events/notifications/notification-created.event';
import { NotificationType } from 'src/common/enums/notification.enum';
import { OrderStatus } from 'src/common/enums/order.enum';

@Injectable()
export class NotificationService {
  constructor(
    private notificationRepo: NotificationRepo,
    // Used to emit 'notification.created' after saving — triggers Socket + Email listeners
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createNotification(user: IHUser, body: NotificationDto) {
    return this.persistAndPublish({
      receiver: user._id,
      ...body,
    });
  }

  // Called by OrderCreatedListener when 'order.created' is emitted
  async createOrderCreatedNotification(event: OrderCreatedEvent) {
    return this.persistAndPublish({
      receiver: event.userId,
      title: 'Order Placed',
      message: 'Your order has been placed successfully.',
      notificationType: NotificationType.ORDER,
      isRead: false,
      relatedEntityId: event.orderId,
    });
  }

  // Called by OrderStatusUpdatedListener when 'order.status.updated' is emitted
  async createOrderStatusUpdatedNotification(event: OrderStatusUpdatedEvent) {
    const { title, message } = this.getOrderStatusMessage(event.status);

    return this.persistAndPublish({
      receiver: event.userId,
      title,
      message,
      notificationType: NotificationType.ORDER,
      isRead: false,
      relatedEntityId: event.orderId,
    });
  }

  async getAllUserNotifications(user: IHUser) {
    const notifications = await this.notificationRepo.findAll({
      filter: { receiver: user._id },
    });
    return notifications;
  }

  async markAsRead(notificationId: string, user: IHUser) {
    const userNotification = await this.notificationRepo.findOne({
      filter: {
        _id: notificationId,
        receiver: user._id,
      },
    });
    if (!userNotification) {
      throw new NotFoundException('Notification not found');
    }

    return await this.notificationRepo.updateOne({
      filter: {
        _id: userNotification._id,
        receiver: user._id,
      },
      update: {
        isRead: true,
      },
    });
  }

  async deleteNotification(notificationId: string, user: IHUser) {
    const userNotification = await this.notificationRepo.findOne({
      filter: {
        _id: notificationId,
        receiver: user._id,
      },
    });
    if (!userNotification) {
      throw new NotFoundException('Notification not found');
    }
    return await this.notificationRepo.deleteOne({
      filter: { _id: userNotification._id },
    });
  }

  // Single entry point: save to DB first, then notify delivery channels (Socket + Email)
  private async persistAndPublish(
    data: Record<string, unknown>,
  ): Promise<IHNotification> {
    // Step 1: Persist — MongoDB is the source of truth (works even if user is offline)
    const createdNotification = await this.notificationRepo.create({ data });
    const notification = Array.isArray(createdNotification)
      ? createdNotification[0]
      : createdNotification;

    // Step 2: Emit — triggers NotificationRealtimeListener + NotificationEmailListener
    this.eventEmitter.emit(
      'notification.created',
      new NotificationCreatedEvent(notification),
    );

    return notification;
  }

  // Maps order status enum to user-friendly notification title and message
  private getOrderStatusMessage(status: OrderStatus) {
    switch (status) {
      case OrderStatus.CONFIRMED:
        return {
          title: 'Order Confirmed',
          message: 'Your order has been confirmed.',
        };
      case OrderStatus.SHIPPED:
        return {
          title: 'Order Shipped',
          message: 'Your order is on the way.',
        };
      case OrderStatus.DELIVERED:
        return {
          title: 'Order Delivered',
          message: 'Your order has been delivered.',
        };
      case OrderStatus.CANCELLED:
        return {
          title: 'Order Cancelled',
          message: 'Your order has been cancelled.',
        };
      default:
        return {
          title: 'Order Updated',
          message: `Your order status is now ${status}.`,
        };
    }
  }
}
