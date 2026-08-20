import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from 'src/models/order.model';
import { OrderRepo } from 'src/Rebo/order.repo';
import { ProductModule } from '../product/product.module';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { TokenServices } from 'src/common/Services/Token.services';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '../redis/redis.service';
import { RedisModule } from '../redis/redis.module';
import { RolesGuard } from 'src/Security/Guards/authorization.guard';
import { AuthGuard } from 'src/Security/Guards/authentication.guard';
import { StripeService } from 'src/common/Services/stripe.service';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Order.name,
        schema: OrderSchema,
      },
    ]),
    ProductModule,
    RedisModule,
    UserModule,
  ],
  providers: [
    OrderService,
    OrderRepo,
    TokenServices,
    JwtService,
    RedisService,
    RolesGuard,
    AuthGuard,
    StripeService,
  ],
  controllers: [OrderController],
  exports: [OrderService],
})
export class OrderModule {}
