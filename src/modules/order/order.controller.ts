import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/Security/Guards/authentication.guard';
import { CreateOrderDto } from './order.dto';
import { OrderService } from './order.service';
import { User } from 'src/common/decorators/user.decorator';
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
  @Get('cancel-order/:id')
  async cancelOrder(@Param('id') orderId: string, @User() user: IHUser) {
    return this.orderService.cancelOrder(orderId, user);
  }

  @UseGuards(AuthGuard)
  @Patch('update-order-status/:id')
  async updateOrderStatus(
    @Param('id') orderId: string,
    @Body('status') status: OrderStatus,
  ) {
    return this.orderService.updateOrderStatus(orderId, status);
  }

  @UseGuards(AuthGuard)
  @Get('get-all-orders')
  async getAllOrders(
    @Query('page') page: number,
    @Query('limit') limit: number,
  ) {
    return this.orderService.getAllOrders(page, limit);
  }
}
