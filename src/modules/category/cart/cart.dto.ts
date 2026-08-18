import { Type } from 'class-transformer';
import {
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  Min,
} from 'class-validator';
import { PaymentMethod } from 'src/common/enums/order.enum';

export class AddToCartDto {
  @IsMongoId()
  @IsNotEmpty()
  product!: string;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  quantity!: number;
}

export class UpdateCartItemDto {
  @IsMongoId()
  @IsNotEmpty()
  product!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity!: number;
}

export class CheckoutCartDto {
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;
}
