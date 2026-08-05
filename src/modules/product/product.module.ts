import { Module } from '@nestjs/common';
import { ProductRepo } from 'src/Rebo/product.repo';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from 'src/models/product.model';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Product.name,
        schema: ProductSchema,
      },
    ]),
  ],
  providers: [ProductRepo],
  exports: [ProductRepo],
})
export class ProductModule {}
