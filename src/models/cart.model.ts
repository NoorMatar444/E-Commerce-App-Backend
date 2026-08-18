import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema()
export class CartItem {
  @Prop({
    type: Types.ObjectId,
    ref: 'Product',
    required: true,
  })
  product!: Types.ObjectId;

  @Prop({
    required: true,
    min: 1,
  })
  quantity!: number;
}

export const CartItemSchema = SchemaFactory.createForClass(CartItem);
export type CartDocument = HydratedDocument<Cart & { _id: Types.ObjectId }>;

@Schema({ timestamps: true })
export class Cart {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  })
  user!: Types.ObjectId;

  @Prop({
    type: [CartItemSchema],
    default: [],
  })
  items!: CartItem[];
}

export const CartSchema = SchemaFactory.createForClass(Cart);
