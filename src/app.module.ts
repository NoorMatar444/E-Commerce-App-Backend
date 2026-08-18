import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { AuthModule } from './modules/auth/auth.module';
import { SecurityModule } from './Security/security.module';
import { RedisModule } from './modules/redis/redis.module';
import { NotificationModule } from './modules/notification/notification.module';
import { UserModule } from './modules/user/user.module';
import { OrderModule } from './modules/order/order.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ProductModule } from './modules/product/product.module';
import { CategoryModule } from './modules/category/category.module';
import { CartModule } from './modules/category/cart/cart.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ['.env.docker', '.env.dev'],
      isGlobal: true,
    }),
    EventEmitterModule.forRoot(), // Enables emit() and @OnEvent() across the entire app // EventEmitterModule is used to emit events to the client
    MongooseModule.forRootAsync({
      imports: [ConfigModule], // Ensures ConfigModule is available

      inject: [ConfigService], // Injects ConfigService into the factory
      useFactory: (configService: ConfigService) => ({
        // Grab your variable securely from the .env file
        uri: configService.get<string>('DB_URL'),

        // Your connection lifecycle event listeners
        onConnectionCreate: (connection: Connection) => {
          connection.on('connected', () =>
            console.log('MongoDB status: connected'),
          );
          connection.on('open', () => console.log('MongoDB status: open'));
          connection.on('disconnected', () =>
            console.log('MongoDB status: disconnected'),
          );
          connection.on('reconnected', () =>
            console.log('MongoDB status: reconnected'),
          );
          connection.on('disconnecting', () =>
            console.log('MongoDB status: disconnecting'),
          );

          return connection;
        },
      }),
    }),
    AuthModule,
    SecurityModule,
    RedisModule,
    NotificationModule,
    UserModule,
    OrderModule,
    ProductModule,
    CategoryModule,
    CartModule,
  ],

  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
