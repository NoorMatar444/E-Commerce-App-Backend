import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ProductDocument = HydratedDocument<Product>;

@Schema({ timestamps: true })
export class Product {
  @Prop({
    required: true,
    trim: true,
  })
  name!: string;

  @Prop({
    required: true,
    trim: true,
  })
  description!: string;

  @Prop({
    required: true,
    min: 0,
  })
  price!: number;

  @Prop({
    required: true,
    min: 0,
  })
  stock!: number;

  @Prop({
    type: Types.ObjectId,
    ref: 'Category',
    required: true,
  })
  category!: Types.ObjectId;

  @Prop({
    type: [String],
    default: [],
  })
  images!: string[];

  @Prop({
    default: true,
  })
  isActive!: boolean;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
