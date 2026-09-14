import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CartItemDto, CheckoutDto, CreateCouponDto, CreateOrderDto, UpdateOrderStatusDto } from './dto';

function orderNumber(): string {
  return `ORD-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString('hex').toUpperCase()}`;
}

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  private async applyCoupon(
    tx: Prisma.TransactionClient,
    organizationId: number,
    couponCode: string | undefined,
    subtotal: number,
  ): Promise<{ discount: number; code?: string }> {
    if (!couponCode) return { discount: 0 };
    const coupon = await tx.coupon.findFirst({ where: { organizationId, code: couponCode } });
    if (!coupon || !coupon.active) throw new BadRequestException('Invalid coupon');
    const now = new Date();
    if (coupon.validFrom && coupon.validFrom > now) throw new BadRequestException('Coupon not yet valid');
    if (coupon.validTill && coupon.validTill < now) throw new BadRequestException('Coupon expired');
    if (coupon.minOrderValue && subtotal < Number(coupon.minOrderValue)) {
      throw new BadRequestException(`Minimum order value ${coupon.minOrderValue} not met`);
    }
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException('Coupon usage limit reached');
    }
    const discount =
      coupon.discountType === 'PERCENT'
        ? Math.min((subtotal * Number(coupon.value)) / 100, subtotal)
        : Math.min(Number(coupon.value), subtotal);
    await tx.coupon.update({ where: { id: coupon.id }, data: { usedCount: coupon.usedCount + 1 } });
    return { discount, code: coupon.code };
  }

  async create(organizationId: number, dto: CreateOrderDto) {
    if (!dto.items?.length) throw new BadRequestException('Order must contain at least one item');
    const patient = await this.prisma.patient.findUnique({ where: { id: dto.patientId, organizationId } });
    if (!patient) throw new NotFoundException('Patient not found');

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      let subtotal = 0;
      const lines: {
        productId: number | null;
        productVariantId: number | null;
        packageId: number | null;
        quantity: number;
        price: number;
        discount: number;
        total: number;
      }[] = [];

      for (const item of dto.items) {
        if (item.quantity < 1) throw new BadRequestException('Quantity must be >= 1');
        let price = item.price;
        if (item.productId) {
          const product = await tx.product.findFirst({ where: { id: item.productId, organizationId } });
          if (!product || product.status !== 'ACTIVE') throw new BadRequestException(`Product ${item.productId} unavailable`);
          price = price ?? Number(product.price);
          if (product.trackInventory) {
            if (product.inventoryQuantity < item.quantity) {
              throw new BadRequestException(`Insufficient stock for ${product.name}`);
            }
            const newQty = product.inventoryQuantity - item.quantity;
            await tx.product.update({ where: { id: product.id }, data: { inventoryQuantity: newQty } });
            await tx.inventoryTransaction.create({
              data: {
                productId: product.id,
                type: 'OUT',
                quantity: -item.quantity,
                previousQuantity: product.inventoryQuantity,
                newQuantity: newQty,
                referenceType: 'ORDER',
                notes: 'Order reservation',
              },
            });
          }
        } else if (item.packageId) {
          const pkg = await tx.package.findFirst({ where: { id: item.packageId, organizationId } });
          if (!pkg) throw new BadRequestException(`Package ${item.packageId} not found`);
          price = price ?? Number(pkg.price);
          if (item.productVariantId) {
            const variant = await tx.productVariant.findFirst({
              where: { id: item.productVariantId, product: { organizationId } },
            });
            if (!variant) throw new BadRequestException(`Variant ${item.productVariantId} not found`);
          }
        } else {
          throw new BadRequestException('Each item needs productId or packageId');
        }
        const total = price! * item.quantity;
        subtotal += total;
        lines.push({
          productId: item.productId ?? null,
          productVariantId: item.productVariantId ?? null,
          packageId: item.packageId ?? null,
          quantity: item.quantity,
          price: price!,
          discount: 0,
          total,
        });
      }

      const { discount, code } = await this.applyCoupon(tx, organizationId, dto.couponCode, subtotal);
      const order = await tx.order.create({
        data: {
          patientId: dto.patientId,
          orderNumber: orderNumber(),
          orderType: dto.orderType ?? 'PRODUCT',
          subtotal,
          tax: 0,
          discount,
          couponCode: code,
          total: subtotal - discount,
          shippingAddress: dto.shippingAddress,
          billingAddress: dto.billingAddress,
          notes: dto.notes,
          items: { create: lines },
        },
        include: { items: true },
      });
      return order;
    });
  }

  createCoupon(organizationId: number, dto: CreateCouponDto) {
    const { organizationId: _ignored, ...rest } = dto;
    return this.prisma.coupon.upsert({
      where: { organizationId_code: { organizationId, code: dto.code } },
      create: { ...rest, organizationId, validTill: dto.validTill ? new Date(dto.validTill) : undefined },
      update: { ...rest, validTill: dto.validTill ? new Date(dto.validTill) : undefined },
    });
  }

  listCoupons(organizationId: number) {
    return this.prisma.coupon.findMany({ where: { organizationId }, orderBy: { code: 'asc' } });
  }

  async getCart(organizationId: number, patientId: number) {
    const patient = await this.prisma.patient.findUnique({ where: { id: patientId, organizationId } });
    if (!patient) throw new NotFoundException('Patient not found');
    await this.prisma.cart.upsert({
      where: { patientId },
      create: { patientId },
      update: {},
    });
    return this.prisma.cart.findUnique({
      where: { patientId },
      include: { items: { include: { product: true, package: true } } },
    });
  }

  async addToCart(organizationId: number, patientId: number, dto: CartItemDto) {
    if (!dto.productId && !dto.packageId) throw new BadRequestException('productId or packageId required');
    if (dto.quantity < 1) throw new BadRequestException('Quantity must be >= 1');
    const patient = await this.prisma.patient.findUnique({ where: { id: patientId, organizationId } });
    if (!patient) throw new NotFoundException('Patient not found');
    const cart = await this.prisma.cart.upsert({
      where: { patientId },
      create: { patientId },
      update: {},
    });
    const existing = await this.prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId: dto.productId ?? null,
        productVariantId: dto.productVariantId ?? null,
        packageId: dto.packageId ?? null,
      },
    });
    if (existing) {
      await this.prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + dto.quantity },
      });
    } else {
      await this.prisma.cartItem.create({ data: { cartId: cart.id, ...dto } });
    }
    return this.getCart(organizationId, patientId);
  }

  async removeFromCart(organizationId: number, patientId: number, itemId: number) {
    const patient = await this.prisma.patient.findUnique({ where: { id: patientId, organizationId } });
    if (!patient) throw new NotFoundException('Patient not found');
    const cart = await this.prisma.cart.findUnique({ where: { patientId } });
    if (!cart) throw new NotFoundException('Cart not found');
    await this.prisma.cartItem.deleteMany({ where: { id: itemId, cartId: cart.id } });
    return this.getCart(organizationId, patientId);
  }

  async checkout(organizationId: number, dto: CheckoutDto) {
    const patient = await this.prisma.patient.findUnique({ where: { id: dto.patientId, organizationId } });
    if (!patient) throw new NotFoundException('Patient not found');
    const cart = await this.prisma.cart.findUnique({
      where: { patientId: dto.patientId },
      include: { items: true },
    });
    if (!cart || cart.items.length === 0) throw new BadRequestException('Cart is empty');
    const order = await this.create(organizationId, {
      patientId: dto.patientId,
      couponCode: dto.couponCode,
      shippingAddress: dto.shippingAddress,
      billingAddress: dto.billingAddress,
      notes: dto.notes,
      items: cart.items.map((i) => ({
        productId: i.productId ?? undefined,
        productVariantId: i.productVariantId ?? undefined,
        packageId: i.packageId ?? undefined,
        quantity: i.quantity,
      })),
    });
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return order;
  }

  list(organizationId: number, patientId?: number, status?: string) {
    return this.prisma.order.findMany({
      where: {
        patient: { organizationId },
        ...(patientId ? { patientId } : {}),
        ...(status ? { status: status as never } : {}),
      },
      include: { items: { include: { product: true, package: true } }, payments: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(id: number, organizationId: number) {
    const order = await this.prisma.order.findFirst({
      where: { id, patient: { organizationId } },
      include: { items: { include: { product: true, package: true } }, payments: true, invoices: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async setStatus(id: number, organizationId: number, dto: UpdateOrderStatusDto) {
    const order = await this.get(id, organizationId);
    if (dto.status === 'CANCELLED' && order.status !== 'CANCELLED') {
      await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        for (const item of order.items) {
          if (item.productId) {
            const product = await tx.product.findUnique({ where: { id: item.productId } });
            if (product?.trackInventory) {
              const newQty = product.inventoryQuantity + item.quantity;
              await tx.product.update({ where: { id: product.id }, data: { inventoryQuantity: newQty } });
              await tx.inventoryTransaction.create({
                data: {
                  productId: product.id,
                  type: 'IN',
                  quantity: item.quantity,
                  previousQuantity: product.inventoryQuantity,
                  newQuantity: newQty,
                  referenceType: 'ORDER_CANCEL',
                  referenceId: id,
                },
              });
            }
          }
        }
        await tx.order.update({ where: { id }, data: { status: 'CANCELLED' } });
      });
      return this.get(id, organizationId);
    }
    return this.prisma.order.update({ where: { id }, data: { status: dto.status } });
  }
}
