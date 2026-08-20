import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from './user.model';
import { NotificationType } from 'src/common/enums/notification.enum';

export type IHNotification = HydratedDocument<Notification>;

@Schema({
  timestamps: true,
})
export class Notification {
  @Prop({
    type: Types.ObjectId,
    ref: User.name,
    required: true,
    index: true,
  })
  receiver!: Types.ObjectId;

  @Prop({
    required: true,
    trim: true,
  })
  title!: string;

  @Prop({
    required: true,
    trim: true,
  })
  message!: string;

  @Prop({
    type: String,
    enum: NotificationType,
    required: true,
  })
  notificationType!: NotificationType;

  @Prop({
    default: false,
  })
  isRead!: boolean;

  // Optional: useful when clicking the notification
  @Prop()
  redirectUrl?: string;

  // Optional: related entity (order, product, etc.)
  @Prop({
    type: Types.ObjectId,
  })
  relatedEntityId?: Types.ObjectId;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
