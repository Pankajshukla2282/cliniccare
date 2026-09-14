import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard(organizationId: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      todaysAppointments,
      newPatients,
      revenue,
      pendingPayments,
      openOrders,
      lowStock,
      upcomingFollowUps,
      noShow,
      totalAppointments,
    ] = await Promise.all([
      this.prisma.appointment.count({
        where: {
          appointmentDate: { gte: today },
          clinic: { organizationId },
        },
      }),
      this.prisma.patient.count({ where: { organizationId, createdAt: { gte: monthAgo } } }),
      this.prisma.payment.aggregate({
        where: { status: 'SUCCESS', patient: { organizationId }, createdAt: { gte: monthAgo } },
        _sum: { amount: true },
      }),
      this.prisma.payment.count({
        where: { status: { in: ['PENDING', 'PROCESSING'] }, patient: { organizationId } },
      }),
      this.prisma.order.count({
        where: { status: { in: ['CREATED', 'PAYMENT_PENDING', 'PAID', 'PROCESSING'] }, patient: { organizationId } },
      }),
      this.prisma.product.count({
        where: { organizationId, trackInventory: true, status: 'ACTIVE' },
      }),
      this.prisma.followUp.count({
        where: { status: 'PENDING', patient: { organizationId } },
      }),
      this.prisma.appointment.count({
        where: { status: 'NO_SHOW', clinic: { organizationId }, appointmentDate: { gte: monthAgo } },
      }),
      this.prisma.appointment.count({
        where: { clinic: { organizationId }, appointmentDate: { gte: monthAgo } },
      }),
    ]);

    return {
      todaysAppointments,
      newPatientsLast30d: newPatients,
      revenueLast30d: Number(revenue._sum.amount ?? 0),
      pendingPayments,
      openOrders,
      trackedProducts: lowStock,
      pendingFollowUps: upcomingFollowUps,
      noShowRateLast30d: totalAppointments === 0 ? 0 : Number((noShow / totalAppointments).toFixed(3)),
    };
  }

  async doctorRevenue(organizationId: number, doctorId: number, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const [consultations, payments, appointments] = await Promise.all([
      this.prisma.consultation.count({ where: { doctorId, patient: { organizationId }, createdAt: { gte: since } } }),
      this.prisma.payment.aggregate({
        where: { status: 'SUCCESS', createdAt: { gte: since }, order: { patient: { organizationId, consultations: { some: { doctorId } } } } },
        _sum: { amount: true },
      }),
      this.prisma.appointment.groupBy({
        by: ['status'],
        where: { doctorId, patient: { organizationId }, appointmentDate: { gte: since } },
        _count: true,
      }),
    ]);
    return { doctorId, consultations, orderRevenue: Number(payments._sum.amount ?? 0), appointmentsByStatus: appointments };
  }

  async productSales(organizationId: number, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: { order: { patient: { organizationId } }, createdAt: { gte: since } },
      _sum: { quantity: true, total: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 20,
    });
  }

  async packageUtilization(organizationId: number) {
    const purchases = await this.prisma.packagePurchase.findMany({
      where: { package: { organizationId } },
      include: { package: { select: { name: true } } },
    });
    const total = purchases.length;
    const completed = purchases.filter((p) => p.status === 'COMPLETED').length;
    const sessionsRemaining = purchases.reduce((n, p) => n + p.sessionsRemaining, 0);
    return { totalPurchases: total, completed, active: total - completed, sessionsRemaining };
  }

  async appointmentReport(organizationId: number, from?: string, to?: string) {
    const where: Record<string, unknown> = { clinic: { organizationId } };
    if (from || to) {
      where.appointmentDate = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }
    const [byStatus, byType, total, byDay] = await Promise.all([
      this.prisma.appointment.groupBy({ by: ['status'], where, _count: true }),
      this.prisma.appointment.groupBy({ by: ['type'], where, _count: true }),
      this.prisma.appointment.count({ where }),
      this.prisma.appointment.groupBy({
        by: ['appointmentDate'],
        where,
        _count: true,
        orderBy: { appointmentDate: 'asc' },
      }),
    ]);
    return { total, byStatus, byType, byDay };
  }

  async serviceRevenue(organizationId: number, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: { order: { patient: { organizationId } }, createdAt: { gte: since } },
      _sum: { total: true },
      _count: true,
      orderBy: { _sum: { total: 'desc' } },
      take: 20,
    });
  }

  async patientAcquisition(organizationId: number, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const patients = await this.prisma.patient.findMany({
      where: { organizationId, createdAt: { gte: since } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    // Group by day
    const byDay: Record<string, number> = {};
    for (const p of patients) {
      const key = p.createdAt.toISOString().slice(0, 10);
      byDay[key] = (byDay[key] ?? 0) + 1;
    }
    return { total: patients.length, byDay };
  }

  async inventoryReport(organizationId: number) {
    const products = await this.prisma.product.findMany({
      where: { organizationId, trackInventory: true, status: 'ACTIVE' },
      select: { id: true, name: true, inventoryQuantity: true, lowStockThreshold: true, sku: true },
    });
    const lowStock = products.filter((p) => p.inventoryQuantity <= p.lowStockThreshold);
    const outOfStock = products.filter((p) => p.inventoryQuantity === 0);
    return {
      totalTracked: products.length,
      lowStockCount: lowStock.length,
      outOfStockCount: outOfStock.length,
      lowStock,
      outOfStock,
    };
  }

  async paymentReport(organizationId: number, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const [total, byMethod, byStatus, refunds] = await Promise.all([
      this.prisma.payment.aggregate({
        where: { status: 'SUCCESS', patient: { organizationId }, createdAt: { gte: since } },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.payment.groupBy({
        by: ['method'],
        where: { status: 'SUCCESS', patient: { organizationId }, createdAt: { gte: since } },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.payment.groupBy({
        by: ['status'],
        where: { patient: { organizationId }, createdAt: { gte: since } },
        _count: true,
      }),
      this.prisma.refund.aggregate({
        where: { order: { patient: { organizationId } }, createdAt: { gte: since } },
        _sum: { amount: true },
        _count: true,
      }),
    ]);
    return {
      totalCollected: Number(total._sum.amount ?? 0),
      totalTransactions: total._count,
      byMethod,
      byStatus,
      refunds: { count: refunds._count, amount: Number(refunds._sum.amount ?? 0) },
    };
  }
}
