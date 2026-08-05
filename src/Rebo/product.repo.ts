import { Injectable } from '@nestjs/common';
import { DbRepo } from './db.repo';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product } from 'src/models/product.model';

@Injectable()
export class ProductRepo extends DbRepo<Product> {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<Product>,
  ) {
    super(productModel);
  }
}
