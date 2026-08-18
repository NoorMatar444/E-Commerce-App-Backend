import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationCreatedEvent } from 'src/common/events/notifications/notification-created.event';
import { NotificationGateway } from '../notification.gateway';

// Delivery layer only — does NOT save to MongoDB.
// Runs after NotificationService.persistAndPublish() emits 'notification.created'.
@Injectable()
export class NotificationRealtimeListener {
  constructor(private readonly notificationGateway: NotificationGateway) {}

  @OnEvent('notification.created')
  handleNotificationCreated(event: NotificationCreatedEvent) {
    const userId = event.notification.receiver.toString();
    // Push live to all sockets in room user:{userId} (phone, laptop, etc.)
    this.notificationGateway.sendToUser(userId, event.notification);
  }
}
