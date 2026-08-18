import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Notification,
  NotificationSchema,
} from 'src/models/notification.model';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationGateway } from './notification.gateway';
import { OrderCreatedListener } from './listeners/order-created.listener';
import { OrderStatusUpdatedListener } from './listeners/order-status-updated.listener';
import { NotificationRealtimeListener } from './listeners/notification-realtime.listener';
import { NotificationEmailListener } from './listeners/notification-email.listener';
import { NotificationRepo } from 'src/Rebo/notification.repo';
import { TokenServices } from 'src/common/Services/Token.services';
import { EmailServices } from 'src/common/Services/email.service';
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

  providers: [
    NotificationService,
    NotificationRepo,
    NotificationGateway, // WebSocket server — must be in providers to start
    OrderCreatedListener, // Listens: 'order.created'
    OrderStatusUpdatedListener, // Listens: 'order.status.updated'
    NotificationRealtimeListener, // Listens: 'notification.created' → Socket push
    NotificationEmailListener, // Listens: 'notification.created' → Email send
    TokenServices, // Required by NotificationGateway for JWT auth on connect
    EmailServices, // Required by NotificationEmailListener
    JwtService,
  ],

  exports: [NotificationService],
})
export class NotificationModule {}
