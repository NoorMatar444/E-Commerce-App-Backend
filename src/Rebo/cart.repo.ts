import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cart } from 'src/models/cart.model';
import { DbRepo } from './db.repo';

@Injectable()
export class CartRepo extends DbRepo<Cart> {
  constructor(@InjectModel(Cart.name) private cartModel: Model<Cart>) {
    super(cartModel);
  }
}
