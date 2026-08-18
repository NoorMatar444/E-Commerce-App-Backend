import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { User } from 'src/common/decorators/user.decorator';
import type { IHUser } from 'src/models/user.model';
import { AuthGuard } from 'src/Security/Guards/authentication.guard';
import { AddToCartDto, CheckoutCartDto, UpdateCartItemDto } from './cart.dto';
import { CartService } from './cart.service';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @UseGuards(AuthGuard)
  @Get('get-user-cart')
  async getUserCart(@User() user: IHUser) {
    return this.cartService.getUserCart(user);
  }

  @UseGuards(AuthGuard)
  @Post('add-to-cart')
  async addToCart(@Body() body: AddToCartDto, @User() user: IHUser) {
    return this.cartService.addToCart(user, body.product, body.quantity);
  }

  @UseGuards(AuthGuard)
  @Patch('update-cart-item')
  async updateCartItem(@Body() body: UpdateCartItemDto, @User() user: IHUser) {
    return this.cartService.updateCartItemQuantity(
      user,
      body.product,
      body.quantity,
    );
  }

  @UseGuards(AuthGuard)
  @Delete('remove-cart-item/:productId')
  async removeCartItem(
    @Param('productId') productId: string,
    @User() user: IHUser,
  ) {
    return this.cartService.removeFromCart(user, productId);
  }

  @UseGuards(AuthGuard)
  @Delete('clear-cart')
  async clearCart(@User() user: IHUser) {
    return this.cartService.clearCart(user);
  }

  @UseGuards(AuthGuard)
  @Post('checkout')
  async checkout(@Body() body: CheckoutCartDto, @User() user: IHUser) {
    return this.cartService.checkout(user, body.paymentMethod);
  }
}
