import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { OrderStatus } from 'src/common/enums/order.enum';

@Schema()
export class OrderItem {
  @Prop({
    type: Types.ObjectId,
    ref: 'Product',
    required: true,
  })
  product!: Types.ObjectId;

  @Prop({ required: true })
  quantity!: number;

  @Prop({ required: true })
  price!: number;
}

export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);
export type OrderDocument = HydratedDocument<Order & { _id: Types.ObjectId }>;

@Schema({ timestamps: true })
export class Order {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  user!: Types.ObjectId;

  @Prop({
    type: [OrderItemSchema],
    required: true,
  })
  items!: OrderItem[];

  @Prop({
    required: true,
    min: 0,
  })
  totalAmount!: number;

  @Prop({
    type: String,
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status!: OrderStatus;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
