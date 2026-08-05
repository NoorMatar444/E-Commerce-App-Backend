import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Notification,
  NotificationSchema,
} from 'src/models/notification.model';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationRepo } from 'src/Rebo/notification.repo';
import { TokenServices } from 'src/common/Services/Token.services';
import { JwtService } from '@nestjs/jwt';
import { UserModule } from 'src/modules/user/user.module';
import { RedisModule } from 'src/modules/redis/redis.module';

@Module({
  imports: [
    // Registers the Notification schema/model within this module for dependency injection
    MongooseModule.forFeature([
      {
        name: Notification.name,
        schema: NotificationSchema,
      },
    ]),
    UserModule,
    RedisModule,
  ],

  controllers: [NotificationController],

  providers: [NotificationService, NotificationRepo, TokenServices, JwtService],

  exports: [NotificationService],
})
export class NotificationModule {}
