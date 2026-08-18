import {
  IsArray,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from 'src/common/enums/order.enum';

export class CreateOrderItemDto {
  @IsMongoId()
  @IsNotEmpty()
  product!: string;

  @IsNumber()
  @IsPositive()
  quantity!: number;

  @IsNumber()
  @IsPositive()
  price!: number;
}

export class CreateOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];

  // Needed so card orders can later start a Stripe Checkout Session
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;
}
