import { IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';
import { OrderStatus, OrderType } from '../generated/prisma/client';

export class OrderItemDto {
  @IsOptional()
  @IsInt()
  productId?: number;

  @IsOptional()
  @IsInt()
  productVariantId?: number;

  @IsOptional()
  @IsInt()
  packageId?: number;

  @IsInt()
  quantity!: number;

  @IsOptional()
  @IsNumber()
  price?: number;
}

export class CreateOrderDto {
  @IsInt()
  patientId!: number;

  @IsOptional()
  @IsEnum(OrderType)
  orderType?: OrderType;

  items!: OrderItemDto[];

  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsOptional()
  @IsString()
  shippingAddress?: string;

  @IsOptional()
  @IsString()
  billingAddress?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status!: OrderStatus;
}

export class CreateCouponDto {
  @IsInt()
  organizationId!: number;

  @IsString()
  code!: string;

  @IsString()
  discountType!: string;

  @IsNumber()
  value!: number;

  @IsOptional()
  @IsNumber()
  minOrderValue?: number;

  @IsOptional()
  @IsString()
  validTill?: string;

  @IsOptional()
  @IsInt()
  usageLimit?: number;
}

export class CartItemDto {
  @IsOptional()
  @IsInt()
  productId?: number;

  @IsOptional()
  @IsInt()
  productVariantId?: number;

  @IsOptional()
  @IsInt()
  packageId?: number;

  @IsInt()
  quantity!: number;
}

export class CheckoutDto {
  @IsInt()
  patientId!: number;

  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsOptional()
  @IsString()
  shippingAddress?: string;

  @IsOptional()
  @IsString()
  billingAddress?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
