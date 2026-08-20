import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  type RawBodyRequest,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from 'src/Security/Guards/authentication.guard';
import { RolesGuard } from 'src/Security/Guards/authorization.guard';
import { CreateOrderDto } from './order.dto';
import { OrderService } from './order.service';
import { User } from 'src/common/decorators/user.decorator';
import { Roles } from 'src/common/decorators/roles.decorators';
import { RoleEnum } from 'src/common/enums/user.enum';
import type { IHUser } from 'src/models/user.model';
import { OrderStatus } from 'src/common/enums/order.enum';

@Controller('order')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @UseGuards(AuthGuard)
  @Post('create-order')
  async createOrder(
    @Body() body: CreateOrderDto,
    @User() user: IHUser,
  ): Promise<unknown> {
    return this.orderService.createOrder(body, user);
  }
  @UseGuards(AuthGuard)
  @Get('get-user-order')
  async getUserOrders(@User() user: IHUser) {
    return this.orderService.getUserOrders(user);
  }
  @UseGuards(AuthGuard)
  @Get('get-order-by-id/:id')
  async getOrderById(@Param('id') orderId: string, @User() user: IHUser) {
    return this.orderService.getOrderById(orderId, user);
  }

  @UseGuards(AuthGuard)
  @Delete('cancel-order/:id')
  async cancelOrder(@Param('id') orderId: string, @User() user: IHUser) {
    return this.orderService.cancelOrder(orderId, user);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @Patch('update-order-status/:id')
  async updateOrderStatus(
    @Param('id') orderId: string,
    @Body('status') status: OrderStatus,
  ) {
    return this.orderService.updateOrderStatus(orderId, status);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @Get('get-all-orders')
  async getAllOrders(
    @Query('page') page: number,
    @Query('limit') limit: number,
  ) {
    return this.orderService.getAllOrders(page, limit);
  }

  // Creates a Checkout Session and returns Stripe's hosted payment URL
  @UseGuards(AuthGuard)
  @Post('checkout/:id')
  async checkoutWithStripe(@Param('id') orderId: string, @User() user: IHUser) {
    return this.orderService.checkoutWithStripe(orderId, user);
  }

  // Public on purpose: Stripe servers call this, not the logged-in user
  @Post('webhook')
  @HttpCode(200)
  async stripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    return this.orderService.handleStripeWebhook(req.rawBody, signature);
  }
}
