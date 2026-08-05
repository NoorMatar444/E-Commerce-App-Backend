import { IsBoolean, IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { NotificationType } from 'src/common/enums/notification.enum';

export class NotificationDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  message!: string;

  @IsNotEmpty()
  @IsEnum(NotificationType)
  notificationType!: NotificationType;

  @IsBoolean()
  isRead!: boolean;
}
