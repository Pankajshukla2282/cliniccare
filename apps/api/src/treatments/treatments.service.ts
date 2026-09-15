import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  AddSessionDto,
  CreatePackageDto,
  CreateTreatmentPlanDto,
  PurchasePackageDto,
  SetSessionStatusDto,
} from './dto';

@Injectable()
export class TreatmentsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertPatientInOrg(patientId: number, organizationId: number) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: { organizationId: true },
    });
    if (!patient || patient.organizationId !== organizationId) {
      throw new NotFoundException('Patient not found');
    }
  }

  async createPlan(organizationId: number, dto: CreateTreatmentPlanDto) {
    await this.assertPatientInOrg(dto.patientId, organizationId);
    const doctor = await this.prisma.doctor.findFirst({
      where: { id: dto.doctorId, clinic: { organizationId } },
    });
    if (!doctor) throw new NotFoundException('Doctor not found');
    if (dto.clinicId) {
      const clinic = await this.prisma.clinic.findFirst({ where: { id: dto.clinicId, organizationId } });
      if (!clinic) throw new NotFoundException('Clinic not found');
    }
    return this.prisma.treatmentPlan.create({
      data: {
        patientId: dto.patientId,
        doctorId: dto.doctorId,
        clinicId: dto.clinicId,
        title: dto.title,
        type: dto.type ?? 'CONSULTATION',
        totalSessions: dto.totalSessions,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        targetCompletion: dto.targetCompletion ? new Date(dto.targetCompletion) : undefined,
        notes: dto.notes,
      },
    });
  }

  listPlans(organizationId: number, patientId?: number, doctorId?: number, type?: string) {
    return this.prisma.treatmentPlan.findMany({
      where: {
        patient: { organizationId },
        ...(patientId ? { patientId } : {}),
        ...(doctorId ? { doctorId } : {}),
        ...(type ? { type: type as never } : {}),
      },
      include: { sessions: { orderBy: { sessionNumber: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPlan(id: number, organizationId: number) {
    const plan = await this.prisma.treatmentPlan.findFirst({
      where: { id, patient: { organizationId } },
      include: {
        sessions: { orderBy: { sessionNumber: 'asc' } },
        skinAssessments: true,
        beforeAfterImages: true,
      },
    });
    if (!plan) throw new NotFoundException('Treatment plan not found');
    return plan;
  }

  async addSession(planId: number, organizationId: number, dto: AddSessionDto) {
    const plan = await this.getPlan(planId, organizationId);
    const nextNumber =
      dto.sessionNumber ??
      (plan.sessions.length > 0 ? Math.max(...plan.sessions.map((s) => s.sessionNumber)) + 1 : 1);
    if (plan.totalSessions && nextNumber > plan.totalSessions) {
      throw new BadRequestException('Session number exceeds planned total sessions');
    }
    const session = await this.prisma.treatmentSession.upsert({
      where: { treatmentPlanId_sessionNumber: { treatmentPlanId: planId, sessionNumber: nextNumber } },
      create: {
        treatmentPlanId: planId,
        sessionNumber: nextNumber,
        date: new Date(dto.date),
        startTime: dto.startTime,
        endTime: dto.endTime,
        parameters: (dto.parameters ?? undefined) as Prisma.InputJsonValue | undefined,
        observations: dto.observations,
        notes: dto.notes,
      },
      update: {
        date: new Date(dto.date),
        startTime: dto.startTime,
        endTime: dto.endTime,
        parameters: (dto.parameters ?? undefined) as Prisma.InputJsonValue | undefined,
        observations: dto.observations,
        notes: dto.notes,
      },
    });
    const completed = await this.prisma.treatmentSession.count({
      where: { treatmentPlanId: planId, status: 'COMPLETED' },
    });
    await this.prisma.treatmentPlan.update({
      where: { id: planId },
      data: { completedSessions: completed },
    });
    return session;
  }

  async setSessionStatus(planId: number, sessionNumber: number, organizationId: number, dto: SetSessionStatusDto) {
    await this.getPlan(planId, organizationId);
    const session = await this.prisma.treatmentSession.update({
      where: { treatmentPlanId_sessionNumber: { treatmentPlanId: planId, sessionNumber } },
      data: { status: dto.status, observations: dto.observations },
    }).catch((): null => null);
    if (!session) throw new NotFoundException('Treatment session not found');
    const completed = await this.prisma.treatmentSession.count({
      where: { treatmentPlanId: planId, status: 'COMPLETED' },
    });
    await this.prisma.treatmentPlan.update({
      where: { id: planId },
      data: {
        completedSessions: completed,
        ...(dto.status === 'COMPLETED' ? {} : {}),
      },
    });
    return session;
  }

  createPackage(organizationId: number, dto: CreatePackageDto) {
    return this.prisma.package.create({ data: { ...dto, organizationId } });
  }

  listPackages(organizationId: number) {
    return this.prisma.package.findMany({ where: { organizationId }, orderBy: { name: 'asc' } });
  }

  async purchasePackage(organizationId: number, dto: PurchasePackageDto) {
    const pkg = await this.prisma.package.findFirst({ where: { id: dto.packageId, organizationId } });
    if (!pkg) throw new NotFoundException('Package not found');
    await this.assertPatientInOrg(dto.patientId, organizationId);
    const total = pkg.totalSessions ?? 1;
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const purchase = await tx.packagePurchase.create({
        data: {
          patientId: dto.patientId,
          packageId: dto.packageId,
          sessionsRemaining: total,
        },
      });
      await tx.packageEntitlement.createMany({
        data: Array.from({ length: total }, (_, i) => ({
          purchaseId: purchase.id,
          sessionNumber: i + 1,
        })),
      });
      return tx.packagePurchase.findUnique({
        where: { id: purchase.id },
        include: { entitlements: { orderBy: { sessionNumber: 'asc' } }, package: true },
      });
    });
  }

  async useNextSession(purchaseId: number, organizationId: number) {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const purchase = await tx.packagePurchase.findFirst({
        where: { id: purchaseId, patient: { organizationId } },
        include: { entitlements: { orderBy: { sessionNumber: 'asc' } } },
      });
      if (!purchase) throw new NotFoundException('Package purchase not found');
      const next = purchase.entitlements.find((e) => e.status === 'ACTIVE');
      if (!next) throw new BadRequestException('No remaining sessions in this package');
      await tx.packageEntitlement.update({
        where: { id: next.id },
        data: { status: 'USED', usedAt: new Date() },
      });
      return tx.packagePurchase.update({
        where: { id: purchaseId },
        data: {
          sessionsUsed: purchase.sessionsUsed + 1,
          sessionsRemaining: Math.max(purchase.sessionsRemaining - 1, 0),
          status: purchase.sessionsRemaining - 1 <= 0 ? 'COMPLETED' : purchase.status,
        },
        include: { entitlements: { orderBy: { sessionNumber: 'asc' } } },
      });
    });
  }
}
