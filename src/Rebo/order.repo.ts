import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { DbRepo } from './db.repo';
import { Model } from 'mongoose';
import { Order } from 'src/models/order.model';

@Injectable()
export class OrderRepo extends DbRepo<Order> {
  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<Order>,
  ) {
    super(orderModel);
  }
}
