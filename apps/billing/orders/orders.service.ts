import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../api/prisma/prisma.service';
import { CreateOrderDto, UpdateOrderDto } from './dto';

@Injectable()
export class OrdersService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(organizationId: number, dto: CreateOrderDto) {
    return this.prisma.order.create({
      data: {
        organizationId,
        orderNumber: dto.orderNumber,
        orderType: dto.orderType,
        status: dto.status,
        patientId: dto.patientId,
        subtotal: dto.subtotal,
        tax: dto.tax,
        discount: dto.discount,
        total: dto.total,
        shippingAddress: dto.shippingAddress,
        billingAddress: dto.billingAddress,
        notes: dto.notes,
      },
    });
  }

  async list(organizationId: number, patientId?: number, skip = 0, take = 20) {
    return this.prisma.order.findMany({
      where: {
        organizationId,
        ...(patientId ? { patientId } : {}),
      },
      include: { items: true, payments: true, invoices: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take: Math.min(take, 100),
    });
  }

  async get(id: number, organizationId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id, organizationId },
      include: { items: true, payments: true, invoices: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async update(id: number, organizationId: number, dto: UpdateOrderDto) {
    return this.prisma.order.update({
      where: { id, organizationId },
      data: {
        status: dto.status,
        subtotal: dto.subtotal,
        tax: dto.tax,
        discount: dto.discount,
        total: dto.total,
        notes: dto.notes,
      },
    });
  }

  async cancel(id: number, organizationId: number) {
    return this.prisma.order.update({
      where: { id, organizationId },
      data: { status: 'CANCELLED' },
    });
  }
}