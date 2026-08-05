import { Model } from 'mongoose';
import { DbRepo } from './db.repo';
import { InjectModel } from '@nestjs/mongoose';
import { Notification } from '../models/notification.model';
import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationRepo extends DbRepo<Notification> {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<Notification>,
  ) {
    super(notificationModel);
  }
}
