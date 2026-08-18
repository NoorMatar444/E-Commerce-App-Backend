import { Module, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { Category, CategorySchema } from 'src/models/category.model';
import { CategoryRepo } from 'src/Rebo/category.repo';
import { RedisModule } from '../redis/redis.module';
import { UserModule } from '../user/user.module';
import { CategoryService } from './category.service';
import { RedisService } from '../redis/redis.service';
import { RolesGuard } from 'src/Security/Guards/authorization.guard';
import { CategoryController } from './category.controller';
import { TokenServices } from 'src/common/Services/Token.services';
import { ProductModule } from '../product/product.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Category.name,
        schema: CategorySchema,
      },
    ]),
    UserModule,
    RedisModule,
    forwardRef(() => ProductModule),
  ],
  providers: [
    CategoryService,
    CategoryRepo,
    JwtService,
    RedisService,
    RolesGuard,
    TokenServices,
  ],
  controllers: [CategoryController],
  exports: [CategoryService],
})
export class CategoryModule {}
