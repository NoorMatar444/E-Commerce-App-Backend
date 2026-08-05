import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { User } from 'src/common/decorators/user.decorator';
import type { IHUser } from 'src/models/user.model';
import { NotificationDto } from './notification.dto';
import { NotificationService } from './notification.service';
import { AuthGuard } from 'src/Security/Guards/authentication.guard';

@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @UseGuards(AuthGuard)
  @Post('create-notification')
  async createNotification(
    @User() user: IHUser,
    @Body() body: NotificationDto,
  ) {
    return this.notificationService.createNotification(user, body);
  }

  @UseGuards(AuthGuard)
  @Get('get-all-user-notifications')
  async getAllUserNotifications(@User() user: IHUser) {
    return this.notificationService.getAllUserNotifications(user);
  }

  @UseGuards(AuthGuard)
  @Patch(':id/read')
  async markAsRead(@Param('id') notificationId: string, @User() user: IHUser) {
    return this.notificationService.markAsRead(notificationId, user);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  async deleteNotification(
    @Param('id') notificationId: string,
    @User() user: IHUser,
  ) {
    return this.notificationService.deleteNotification(notificationId, user);
  }
}
