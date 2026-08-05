import { Injectable, NotFoundException } from '@nestjs/common';
import { IHUser } from 'src/models/user.model';
import { NotificationRepo } from 'src/Rebo/notification.repo';
import { NotificationDto } from './notification.dto';

@Injectable()
export class NotificationService {
  constructor(private notificationRepo: NotificationRepo) {}
  async createNotification(user: IHUser, body: NotificationDto) {
    const createdNotification = await this.notificationRepo.create({
      data: {
        receiver: user._id,
        ...body,
      },
    });

    return createdNotification;
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
}
