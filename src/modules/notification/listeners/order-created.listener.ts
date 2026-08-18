import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { OrderCreatedEvent } from 'src/common/events/orders/order-created.event';
import { NotificationService } from '../notification.service';

// Listens for order domain events and creates in-app notifications.
// OrderService does NOT call NotificationService directly — this listener decouples them.
@Injectable()
export class OrderCreatedListener {
  constructor(private readonly notificationService: NotificationService) {}

  // Event name must match exactly what OrderService emits in emit('order.created', ...)
  @OnEvent('order.created')
  async handleOrderCreated(event: OrderCreatedEvent) {
    await this.notificationService.createOrderCreatedNotification(event);
  }
}
