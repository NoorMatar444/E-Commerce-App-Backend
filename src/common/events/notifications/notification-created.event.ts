import { IHNotification } from 'src/models/notification.model';

// Payload sent with the 'notification.created' event.
// Fired AFTER the notification is saved to MongoDB.
// Socket and Email listeners use this to deliver the notification.
export class NotificationCreatedEvent {
  constructor(public readonly notification: IHNotification) {}
}
