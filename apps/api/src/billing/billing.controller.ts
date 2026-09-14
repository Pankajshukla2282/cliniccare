import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, OrgId, Permissions, RequestUser } from '../common/decorators';
import { BillingService } from './billing.service';
import { CreateInvoiceDto, CreatePaymentDto, CreateRefundDto } from './dto';

@ApiTags('billing')
@ApiBearerAuth()
@Controller()
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Permissions('billing.manage')
  @Post('payments')
  createPayment(@OrgId() orgId: number, @Body() dto: CreatePaymentDto, @CurrentUser() user: RequestUser) {
    return this.billing.createPayment(orgId, dto, user.sub);
  }

  @Permissions('billing.read')
  @Get('payments')
  listPayments(@OrgId() orgId: number, @Query('patientId') patientId?: string, @Query('orderId') orderId?: string) {
    return this.billing.listPayments(
      orgId,
      patientId ? Number(patientId) : undefined,
      orderId ? Number(orderId) : undefined,
    );
  }

  @Permissions('billing.manage')
  @Post('refunds')
  createRefund(@OrgId() orgId: number, @Body() dto: CreateRefundDto, @CurrentUser() user: RequestUser) {
    return this.billing.createRefund(orgId, dto, user.sub);
  }

  @Permissions('billing.read')
  @Get('refunds')
  listRefunds(@OrgId() orgId: number, @Query('orderId') orderId?: string) {
    return this.billing.listRefunds(orgId, orderId ? Number(orderId) : undefined);
  }

  @Permissions('billing.manage')
  @Post('invoices')
  createInvoice(@OrgId() orgId: number, @Body() dto: CreateInvoiceDto) {
    return this.billing.createInvoice(orgId, dto);
  }

  @Permissions('billing.read')
  @Get('invoices')
  listInvoices(@OrgId() orgId: number, @Query('patientId') patientId?: string) {
    return this.billing.listInvoices(orgId, patientId ? Number(patientId) : undefined);
  }

  @Permissions('billing.read')
  @Get('invoices/:id')
  getInvoice(@Param('id', ParseIntPipe) id: number, @OrgId() orgId: number) {
    return this.billing.getInvoice(id, orgId);
  }
}
