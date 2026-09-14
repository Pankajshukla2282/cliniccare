import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvoiceDto, CreatePaymentDto, CreateRefundDto } from './dto';

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async createPayment(organizationId: number, dto: CreatePaymentDto, performedBy?: number) {
    const patient = await this.prisma.patient.findUnique({ where: { id: dto.patientId, organizationId } });
    if (!patient) throw new NotFoundException('Patient not found');
    if (dto.orderId) {
      const order = await this.prisma.order.findFirst({
        where: { id: dto.orderId, patient: { organizationId } },
        select: { id: true },
      });
      if (!order) throw new NotFoundException('Order not found');
    }
    if (dto.appointmentId) {
      const appointment = await this.prisma.appointment.findFirst({
        where: { id: dto.appointmentId, patient: { organizationId } },
        select: { id: true },
      });
      if (!appointment) throw new NotFoundException('Appointment not found');
    }
    if (dto.treatmentPlanId) {
      const plan = await this.prisma.treatmentPlan.findFirst({
        where: { id: dto.treatmentPlanId, patient: { organizationId } },
        select: { id: true },
      });
      if (!plan) throw new NotFoundException('Treatment plan not found');
    }
    const payment = await this.prisma.payment.create({
      data: {
        orderId: dto.orderId,
        patientId: dto.patientId,
        appointmentId: dto.appointmentId,
        treatmentPlanId: dto.treatmentPlanId,
        amount: dto.amount,
        method: dto.method ?? 'UPI',
        status: dto.status ?? 'PENDING',
        transactionId: dto.transactionId,
        receiptNumber: `RCP-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString('hex').toUpperCase()}`,
        notes: dto.notes,
      },
    });
    if (payment.status === 'SUCCESS' && dto.orderId) {
      const paid = await this.prisma.payment.aggregate({
        where: { orderId: dto.orderId, status: 'SUCCESS' },
        _sum: { amount: true },
      });
      const order = await this.prisma.order.findFirst({ where: { id: dto.orderId, patient: { organizationId } } });
      if (order && Number(paid._sum.amount ?? 0) >= Number(order.total)) {
        await this.prisma.order.update({
          where: { id: dto.orderId },
          data: { paymentStatus: 'SUCCESS', status: 'PAID' },
        });
      } else if (order) {
        await this.prisma.order.update({
          where: { id: dto.orderId },
          data: { paymentStatus: 'PROCESSING' },
        });
      }
    }
    try {
      await this.audit.log({
        entityType: 'payment',
        entityId: payment.id,
        action: 'CREATE',
        performedBy,
        purpose: 'payment_recorded',
      });
    } catch {
      // Audit must never fail a payment record
    }
    return payment;
  }

  async createRefund(organizationId: number, dto: CreateRefundDto, performedBy?: number) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: dto.paymentId, patient: { organizationId } },
      include: { refunds: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    const alreadyRefunded = payment.refunds
      .filter((r) => r.status !== 'REJECTED')
      .reduce((n, r) => n + Number(r.amount), 0);
    if (Number(dto.amount) <= 0 || alreadyRefunded + Number(dto.amount) > Number(payment.amount)) {
      throw new BadRequestException('Refund amount exceeds refundable balance');
    }
    const refund = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const created = await tx.refund.create({ data: { ...dto, status: 'PROCESSED', processedAt: new Date() } });
      const total = alreadyRefunded + Number(dto.amount);
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: total >= Number(payment.amount) ? 'REFUNDED' : 'PARTIALLY_REFUNDED' },
      });
      return created;
    });
    try {
      await this.audit.log({
        entityType: 'refund',
        entityId: refund.id,
        action: 'CREATE',
        performedBy,
        purpose: 'refund_processed',
      });
    } catch {
      // Audit must never fail a refund
    }
    return refund;
  }

  listRefunds(organizationId: number, orderId?: number) {
    return this.prisma.refund.findMany({
      where: { order: { patient: { organizationId } }, ...(orderId ? { orderId } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  listPayments(organizationId: number, patientId?: number, orderId?: number) {
    return this.prisma.payment.findMany({
      where: {
        patient: { organizationId },
        ...(patientId ? { patientId } : {}),
        ...(orderId ? { orderId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createInvoice(organizationId: number, dto: CreateInvoiceDto) {
    const patient = await this.prisma.patient.findUnique({ where: { id: dto.patientId, organizationId } });
    if (!patient) throw new NotFoundException('Patient not found');
    if (dto.orderId) {
      const order = await this.prisma.order.findFirst({
        where: { id: dto.orderId, patient: { organizationId } },
        select: { id: true },
      });
      if (!order) throw new NotFoundException('Order not found');
    }
    if (dto.doctorId) {
      const doctor = await this.prisma.doctor.findFirst({
        where: { id: dto.doctorId, clinic: { organizationId } },
        select: { id: true },
      });
      if (!doctor) throw new NotFoundException('Doctor not found');
    }
    const tax = dto.tax ?? 0;
    return this.prisma.invoice.create({
      data: {
        orderId: dto.orderId,
        patientId: dto.patientId,
        doctorId: dto.doctorId,
        amount: dto.amount,
        tax,
        total: Number(dto.amount) + Number(tax),
        invoiceNumber: `INV-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString('hex').toUpperCase()}`,
        notes: dto.notes,
      },
    });
  }

  listInvoices(organizationId: number, patientId?: number) {
    return this.prisma.invoice.findMany({
      where: { patient: { organizationId }, ...(patientId ? { patientId } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getInvoice(id: number, organizationId: number) {
    const invoice = await this.prisma.invoice.findFirst({ where: { id, patient: { organizationId } } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }
}
