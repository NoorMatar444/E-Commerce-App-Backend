import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { OrderStatusUpdatedEvent } from 'src/common/events/orders/order-status-updated.event';
import { NotificationService } from '../notification.service';

// Handles both admin status updates and user cancellations (same event name).
@Injectable()
export class OrderStatusUpdatedListener {
  constructor(private readonly notificationService: NotificationService) {}

  @OnEvent('order.status.updated')
  async handleOrderStatusUpdated(event: OrderStatusUpdatedEvent) {
    await this.notificationService.createOrderStatusUpdatedNotification(event);
  }
}
