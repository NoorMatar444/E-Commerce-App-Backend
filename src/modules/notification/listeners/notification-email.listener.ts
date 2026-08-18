import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EmailServices } from 'src/common/Services/email.service';
import { NotificationCreatedEvent } from 'src/common/events/notifications/notification-created.event';
import { UserRepo } from 'src/Rebo/user.repo';

// Delivery layer only — sends email when a notification is saved.
// Same event as NotificationRealtimeListener; both run independently.
@Injectable()
export class NotificationEmailListener {
  private readonly logger = new Logger(NotificationEmailListener.name);

  constructor(
    private readonly emailService: EmailServices,
    private readonly userRepo: UserRepo,
  ) {}

  @OnEvent('notification.created')
  async handleNotificationCreated(event: NotificationCreatedEvent) {
    try {
      // Notification stores receiver as ObjectId — look up user to get email address
      const user = await this.userRepo.findById({
        id: event.notification.receiver,
      });

      if (!user?.email) {
        // Log and return — do NOT throw (this is a side effect, not an HTTP request)
        this.logger.warn(
          `Skipping email: no user/email for receiver ${event.notification.receiver.toString()}`,
        );
        return;
      }

      await this.emailService.sendEmail({
        to: user.email,
        subject: event.notification.title,
        text: event.notification.message,
      });
    } catch (error) {
      // Email failure should not break notification creation or socket delivery
      this.logger.error('Failed to send notification email', error);
    }
  }
}
