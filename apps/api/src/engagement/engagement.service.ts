import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CompleteFollowUpDto,
  CreateFollowUpDto,
  CreateLeadDto,
  CreateReviewDto,
  ModerateReviewDto,
  UpdateLeadDto,
} from './dto';

@Injectable()
export class EngagementService {
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

  private async assertDoctorInOrg(doctorId: number, organizationId: number) {
    const doctor = await this.prisma.doctor.findFirst({
      where: { id: doctorId, clinic: { organizationId } },
      select: { id: true },
    });
    if (!doctor) throw new NotFoundException('Doctor not found');
  }

  // Follow-ups
  async createFollowUp(organizationId: number, dto: CreateFollowUpDto) {
    await this.assertPatientInOrg(dto.patientId, organizationId);
    if (dto.doctorId) await this.assertDoctorInOrg(dto.doctorId, organizationId);
    return this.prisma.followUp.create({
      data: { ...dto, dueDate: new Date(dto.dueDate) },
    });
  }

  upcomingFollowUps(organizationId: number, patientId?: number, doctorId?: number, days = 14) {
    const now = new Date();
    const horizon = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return this.prisma.followUp.findMany({
      where: {
        status: 'PENDING',
        dueDate: { gte: now, lte: horizon },
        patient: { organizationId },
        ...(patientId ? { patientId } : {}),
        ...(doctorId ? { doctorId } : {}),
      },
      include: { patient: { select: { patientNumber: true } } },
      orderBy: { dueDate: 'asc' },
    });
  }

  async completeFollowUp(id: number, organizationId: number, dto: CompleteFollowUpDto) {
    const followUp = await this.prisma.followUp.findFirst({ where: { id, patient: { organizationId } } });
    if (!followUp) throw new NotFoundException('Follow-up not found');
    return this.prisma.followUp.update({
      where: { id },
      data: { status: 'COMPLETED', completedAt: new Date(), notes: dto.notes ?? followUp.notes },
    });
  }

  // Reviews (moderated — never auto-published)
  async createReview(organizationId: number, dto: CreateReviewDto) {
    await this.assertPatientInOrg(dto.patientId, organizationId);
    if (dto.doctorId) await this.assertDoctorInOrg(dto.doctorId, organizationId);
    if (dto.serviceId) {
      const service = await this.prisma.service.findFirst({ where: { id: dto.serviceId, organizationId } });
      if (!service) throw new NotFoundException('Service not found');
    }
    return this.prisma.review.create({ data: dto });
  }

  listReviews(organizationId: number, status?: string, doctorId?: number) {
    return this.prisma.review.findMany({
      where: {
        patient: { organizationId },
        ...(status ? { status } : {}),
        ...(doctorId ? { doctorId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async moderateReview(id: number, organizationId: number, dto: ModerateReviewDto, moderatedBy?: number) {
    if (!['APPROVED', 'REJECTED'].includes(dto.status)) {
      throw new BadRequestException('Status must be APPROVED or REJECTED');
    }
    const review = await this.prisma.review.findFirst({
      where: { id, patient: { organizationId } },
    });
    if (!review) throw new NotFoundException('Review not found');
    return this.prisma.review.update({
      where: { id },
      data: { status: dto.status, moderatedBy, moderatedAt: new Date() },
    });
  }

  // CRM leads
  createLead(organizationId: number, dto: CreateLeadDto) {
    return this.prisma.lead.create({ data: { ...dto, organizationId } });
  }

  listLeads(organizationId: number, status?: string) {
    return this.prisma.lead.findMany({
      where: { organizationId, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateLead(id: number, organizationId: number, dto: UpdateLeadDto) {
    const lead = await this.prisma.lead.findFirst({ where: { id, organizationId } });
    if (!lead) throw new NotFoundException('Lead not found');
    return this.prisma.lead.update({ where: { id }, data: dto });
  }
}
