import { Body, Controller, Get, Param, Post, Put, Delete, Query } from '@nestjs/common';
import { ApiTags, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { OrdersService } from './orders.service';
import { CreateOrderDto, UpdateOrderDto } from './dto';

@ApiTags('billing')
@Controller('billing/orders')
export class OrdersController {
  constructor(@Inject(OrdersService) private readonly ordersService: OrdersService) {}

  @Post()
  create(@Body() dto: CreateOrderDto) {
    return this.ordersService.create(dto.organizationId, dto);
  }

  @Get()
  list(@Query('organizationId') organizationId: number, @Query('patientId') patientId?: number) {
    return this.ordersService.list(organizationId, patientId);
  }

  @Get(':id')
  async get(@Param('id') id: number, @Query('organizationId') organizationId: number) {
    return this.ordersService.get(id, organizationId);
  }

  @Put(':id')
  async update(@Param('id') id: number, @Query('organizationId') organizationId: number, @Body() dto: UpdateOrderDto) {
    return this.ordersService.update(id, organizationId, dto);
  }

  @Delete(':id')
  async cancel(@Param('id') id: number, @Query('organizationId') organizationId: number) {
    return this.ordersService.cancel(id, organizationId);
  }
}