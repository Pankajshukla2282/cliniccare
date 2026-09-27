export class CreateOrderDto {
  organizationId!: number;
  orderNumber!: string;
  orderType?: string;
  status?: string;
  patientId?: number;
  subtotal!: number;
  tax!: number;
  discount!: number;
  total!: number;
  shippingAddress?: string;
  billingAddress?: string;
  notes?: string;
}

export class UpdateOrderDto {
  status?: string;
  subtotal?: number;
  tax?: number;
  discount?: number;
  total?: number;
  notes?: string;
}