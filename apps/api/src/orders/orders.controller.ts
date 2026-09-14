import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OrgId, Permissions } from '../common/decorators';
import { CartItemDto, CheckoutDto, CreateCouponDto, CreateOrderDto, UpdateOrderStatusDto } from './dto';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Permissions('order.manage')
  @Post()
  create(@OrgId() orgId: number, @Body() dto: CreateOrderDto) {
    return this.orders.create(orgId, dto);
  }

  @Permissions('order.read')
  @Get()
  list(@OrgId() orgId: number, @Query('patientId') patientId?: string, @Query('status') status?: string) {
    return this.orders.list(orgId, patientId ? Number(patientId) : undefined, status);
  }

  // NOTE: static sub-paths must be registered before ':id' or Express
  // matches them as an id (e.g. GET /orders/coupons -> id='coupons').
  @Permissions('order.read')
  @Get('coupons')
  listCoupons(@OrgId() orgId: number) {
    return this.orders.listCoupons(orgId);
  }

  @Permissions('order.manage')
  @Get('cart')
  getCart(@OrgId() orgId: number, @Query('patientId', ParseIntPipe) patientId: number) {
    return this.orders.getCart(orgId, patientId);
  }

  @Permissions('order.read')
  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number, @OrgId() orgId: number) {
    return this.orders.get(id, orgId);
  }

  @Permissions('order.manage')
  @Patch(':id/status')
  setStatus(@Param('id', ParseIntPipe) id: number, @OrgId() orgId: number, @Body() dto: UpdateOrderStatusDto) {
    return this.orders.setStatus(id, orgId, dto);
  }

  @Permissions('order.manage')
  @Post('coupons')
  createCoupon(@OrgId() orgId: number, @Body() dto: CreateCouponDto) {
    return this.orders.createCoupon(orgId, dto);
  }

  @Permissions('order.manage')
  @Post('cart/items')
  addToCart(@OrgId() orgId: number, @Query('patientId', ParseIntPipe) patientId: number, @Body() dto: CartItemDto) {
    return this.orders.addToCart(orgId, patientId, dto);
  }

  @Permissions('order.manage')
  @Delete('cart/items/:itemId')
  removeFromCart(
    @OrgId() orgId: number,
    @Query('patientId', ParseIntPipe) patientId: number,
    @Param('itemId', ParseIntPipe) itemId: number,
  ) {
    return this.orders.removeFromCart(orgId, patientId, itemId);
  }

  @Permissions('order.manage')
  @Post('cart/checkout')
  checkout(@OrgId() orgId: number, @Body() dto: CheckoutDto) {
    return this.orders.checkout(orgId, dto);
  }
}
