import { Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePatientDto, UpdatePatientDto } from './dto';

@Injectable()
export class PatientsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: number, dto: CreatePatientDto) {
    if (dto.userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: dto.userId },
        select: { organizationId: true },
      });
      if (!user || user.organizationId !== organizationId) {
        throw new NotFoundException('User not found');
      }
    }
    const patientNumber = `P-${randomBytes(4).toString('hex').toUpperCase()}`;
    return this.prisma.patient.create({
      data: {
        organizationId,
        userId: dto.userId,
        patientNumber,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        gender: dto.gender,
        bloodGroup: dto.bloodGroup,
        address: dto.address,
        emergencyContact: dto.emergencyContact,
        emergencyPhone: dto.emergencyPhone,
      },
    });
  }

  list(organizationId: number, search?: string, skip = 0, take = 20) {
    return this.prisma.patient.findMany({
      where: {
        organizationId,
        ...(search
          ? {
              OR: [
                { patientNumber: { contains: search, mode: 'insensitive' } },
                { user: { email: { contains: search, mode: 'insensitive' } } },
                { user: { firstName: { contains: search, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      include: { user: { select: { firstName: true, lastName: true, email: true, phone: true } } },
      orderBy: { id: 'desc' },
      skip,
      take: Math.min(take, 100),
    });
  }

  async get(id: number, organizationId: number) {
    const patient = await this.prisma.patient.findUnique({
      where: { id, organizationId },
      include: {
        user: { select: { firstName: true, lastName: true, email: true, phone: true } },
        appointments: { orderBy: { appointmentDate: 'desc' }, take: 10 },
        treatmentPlans: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    if (!patient) throw new NotFoundException('Patient not found');
    return patient;
  }

  async update(id: number, organizationId: number, dto: UpdatePatientDto) {
    await this.get(id, organizationId);
    const { dateOfBirth, ...rest } = dto;
    return this.prisma.patient.update({
      where: { id },
      data: { ...rest, ...(dateOfBirth ? { dateOfBirth: new Date(dateOfBirth) } : {}) },
    });
  }

  async dashboard(id: number, organizationId: number) {
    const patient = await this.prisma.patient.findUnique({ where: { id, organizationId } });
    if (!patient) throw new NotFoundException('Patient not found');

    const [
      recentAppointments,
      activeTreatmentPlans,
      recentPrescriptions,
      pendingFollowUps,
      medicalRecords,
      consents,
      recentOrders,
      skinAssessments,
    ] = await Promise.all([
      this.prisma.appointment.findMany({
        where: { patientId: id },
        include: { doctor: { include: { user: { select: { firstName: true, lastName: true } } } }, service: true },
        orderBy: { appointmentDate: 'desc' },
        take: 5,
      }),
      this.prisma.treatmentPlan.findMany({
        where: { patientId: id, status: 'ACTIVE' },
        include: { sessions: { orderBy: { sessionNumber: 'asc' } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.prescription.findMany({
        where: { patientId: id },
        include: { items: true, doctor: { include: { user: { select: { firstName: true, lastName: true } } } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.followUp.findMany({
        where: { patientId: id, status: 'PENDING' },
        orderBy: { dueDate: 'asc' },
        take: 5,
      }),
      this.prisma.medicalRecord.findMany({
        where: { patientId: id },
        orderBy: { recordedAt: 'desc' },
        take: 10,
      }),
      this.prisma.consent.findMany({
        where: { patientId: id },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.findMany({
        where: { patientId: id },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.skinAssessment.findMany({
        where: { patientId: id },
        orderBy: { assessmentDate: 'desc' },
        take: 5,
      }),
    ]);

    return {
      patient,
      recentAppointments,
      activeTreatmentPlans,
      recentPrescriptions,
      pendingFollowUps,
      medicalRecords,
      consents,
      recentOrders,
      skinAssessments,
    };
  }

  recordHash() {
    return createHash('sha256').update(String(Date.now())).digest('hex').slice(0, 8);
  }
}
