import { Module, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductRepo } from 'src/Rebo/product.repo';
import { TokenServices } from 'src/common/Services/Token.services';
import { S3BucketServices } from 'src/common/Services/s3Bucket.service';
import { Product, ProductSchema } from 'src/models/product.model';
import { RedisModule } from '../redis/redis.module';
import { RedisService } from '../redis/redis.service';
import { UserModule } from '../user/user.module';
import { ProductControllers } from './product.controller';
import { ProductService } from './product.service';
import { RolesGuard } from 'src/Security/Guards/authorization.guard';
import { CategoryModule } from '../category/category.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Product.name,
        schema: ProductSchema,
      },
    ]),
    UserModule,
    RedisModule,
    forwardRef(() => CategoryModule),
  ],
  providers: [
    ProductRepo,
    ProductService,
    S3BucketServices,
    TokenServices,
    JwtService,
    RedisService,
    RolesGuard,
  ],
  controllers: [ProductControllers],
  exports: [ProductRepo],
})
export class ProductModule {}
