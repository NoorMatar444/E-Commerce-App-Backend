import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { Cart, CartSchema } from 'src/models/cart.model';
import { CartRepo } from 'src/Rebo/cart.repo';
import { TokenServices } from 'src/common/Services/Token.services';
import { ProductModule } from '../../product/product.module';
import { RedisModule } from '../../redis/redis.module';
import { RedisService } from '../../redis/redis.service';
import { UserModule } from '../../user/user.module';
import { OrderModule } from '../../order/order.module';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Cart.name,
        schema: CartSchema,
      },
    ]),
    ProductModule,
    OrderModule,
    UserModule,
    RedisModule,
  ],
  providers: [CartService, CartRepo, TokenServices, JwtService, RedisService],
  controllers: [CartController],
  exports: [CartService],
})
export class CartModule {}
