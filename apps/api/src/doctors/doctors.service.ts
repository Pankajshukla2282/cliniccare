import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AssignSpecialtyDto,
  CreateLeaveDto,
  CreateSpecialtyDto,
  LinkServiceDto,
  UpdateDoctorDto,
  UpsertScheduleDto,
} from './dto';

@Injectable()
export class DoctorsService {
  constructor(private readonly prisma: PrismaService) {}

  private async verifyDoctorBelongsToOrg(doctorId: number, organizationId: number) {
    const doctor = await this.prisma.doctor.findFirst({
      where: { id: doctorId, clinic: { organizationId } },
    });
    if (!doctor) throw new NotFoundException('Doctor not found in this organization');
    return doctor;
  }

  list(organizationId: number, clinicId?: number, status?: string) {
    return this.prisma.doctor.findMany({
      where: {
        clinic: { organizationId },
        ...(clinicId ? { clinicId } : {}),
        ...(status ? { status: status as never } : {}),
      },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        specialties: { include: { specialty: true } },
        services: { include: { service: true } },
      },
      orderBy: { id: 'asc' },
    });
  }

  async get(id: number, organizationId: number) {
    await this.verifyDoctorBelongsToOrg(id, organizationId);
    const doctor = await this.prisma.doctor.findUnique({
      where: { id },
      include: {
        user: { select: { firstName: true, lastName: true, email: true, phone: true } },
        specialties: { include: { specialty: true } },
        services: { include: { service: true } },
        schedules: { orderBy: { dayOfWeek: 'asc' } },
        leaves: { orderBy: { date: 'asc' } },
      },
    });
    if (!doctor) throw new NotFoundException('Doctor not found');
    return doctor;
  }

  async update(id: number, organizationId: number, dto: UpdateDoctorDto) {
    await this.verifyDoctorBelongsToOrg(id, organizationId);
    return this.prisma.doctor.update({ where: { id }, data: dto });
  }

  createSpecialty(dto: CreateSpecialtyDto) {
    return this.prisma.specialty.upsert({
      where: { name: dto.name },
      create: dto,
      update: { description: dto.description, category: dto.category },
    });
  }

  listSpecialties() {
    return this.prisma.specialty.findMany({ orderBy: { name: 'asc' } });
  }

  async assignSpecialty(doctorId: number, organizationId: number, dto: AssignSpecialtyDto) {
    await this.verifyDoctorBelongsToOrg(doctorId, organizationId);
    const specialty = await this.prisma.specialty.findUnique({ where: { id: dto.specialtyId } });
    if (!specialty) throw new NotFoundException('Specialty not found');
    await this.prisma.doctorSpecialty.upsert({
      where: { doctorId_specialtyId: { doctorId, specialtyId: dto.specialtyId } },
      create: { doctorId, specialtyId: dto.specialtyId },
      update: {},
    });
    return this.get(doctorId, organizationId);
  }

  async upsertSchedule(doctorId: number, organizationId: number, dto: UpsertScheduleDto) {
    await this.verifyDoctorBelongsToOrg(doctorId, organizationId);
    if (dto.clinicId) {
      const clinic = await this.prisma.clinic.findFirst({ where: { id: dto.clinicId, organizationId } });
      if (!clinic) throw new NotFoundException('Clinic not found');
    }
    const existing = await this.prisma.doctorSchedule.findFirst({
      where: { doctorId, dayOfWeek: dto.dayOfWeek, clinicId: dto.clinicId ?? null },
    });
    if (existing) {
      return this.prisma.doctorSchedule.update({ where: { id: existing.id }, data: dto });
    }
    return this.prisma.doctorSchedule.create({ data: { doctorId, ...dto } });
  }

  async listSchedules(doctorId: number, organizationId: number) {
    await this.verifyDoctorBelongsToOrg(doctorId, organizationId);
    return this.prisma.doctorSchedule.findMany({
      where: { doctorId },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  async addLeave(doctorId: number, organizationId: number, dto: CreateLeaveDto) {
    await this.verifyDoctorBelongsToOrg(doctorId, organizationId);
    return this.prisma.doctorLeave.upsert({
      where: { doctorId_date: { doctorId, date: new Date(dto.date) } },
      create: { doctorId, date: new Date(dto.date), reason: dto.reason },
      update: { reason: dto.reason },
    });
  }

  async linkService(doctorId: number, organizationId: number, dto: LinkServiceDto) {
    await this.verifyDoctorBelongsToOrg(doctorId, organizationId);
    const service = await this.prisma.service.findFirst({ where: { id: dto.serviceId, organizationId } });
    if (!service) throw new NotFoundException('Service not found');
    await this.prisma.doctorService.upsert({
      where: { doctorId_serviceId: { doctorId, serviceId: dto.serviceId } },
      create: { doctorId, serviceId: dto.serviceId, feeOverride: dto.feeOverride },
      update: { feeOverride: dto.feeOverride },
    });
    return this.get(doctorId, organizationId);
  }
}
