import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClinicDto, CreateHolidayDto, CreateOrganizationDto, CreateRoomDto, UpdateClinicDto } from './dto';

@Injectable()
export class ClinicsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  createOrganization(dto: CreateOrganizationDto) {
    return this.prisma.organization.create({ data: dto });
  }

  listOrganizations() {
    return this.prisma.organization.findMany({ orderBy: { id: 'asc' } });
  }

  createClinic(organizationId: number, dto: CreateClinicDto) {
    const { organizationId: _ignored, ...rest } = dto;
    return this.prisma.clinic.create({ data: { ...rest, organizationId } });
  }

  listClinics(organizationId: number) {
    return this.prisma.clinic.findMany({ where: { organizationId }, orderBy: { id: 'asc' } });
  }

  async getClinic(id: number, organizationId?: number) {
    const clinic = await this.prisma.clinic.findUnique({
      where: organizationId !== undefined ? { id, organizationId } : { id },
      include: { doctors: { include: { user: { select: { firstName: true, lastName: true, email: true } } } } },
    });
    if (!clinic) throw new NotFoundException('Clinic not found');
    return clinic;
  }

  async updateClinic(id: number, organizationId: number, dto: UpdateClinicDto) {
    await this.getClinic(id, organizationId);
    return this.prisma.clinic.update({ where: { id }, data: dto });
  }

  async addHoliday(clinicId: number, organizationId: number, dto: CreateHolidayDto) {
    await this.getClinic(clinicId, organizationId);
    return this.prisma.clinicHoliday.upsert({
      where: { clinicId_date: { clinicId, date: new Date(dto.date) } },
      create: { clinicId, date: new Date(dto.date), reason: dto.reason },
      update: { reason: dto.reason },
    });
  }

  async listHolidays(clinicId: number, organizationId: number) {
    await this.getClinic(clinicId, organizationId);
    return this.prisma.clinicHoliday.findMany({ where: { clinicId }, orderBy: { date: 'asc' } });
  }

  async createRoom(clinicId: number, organizationId: number, dto: CreateRoomDto) {
    await this.getClinic(clinicId, organizationId);
    return this.prisma.room.upsert({
      where: { clinicId_name: { clinicId, name: dto.name } },
      create: { clinicId, ...dto },
      update: { capacity: dto.capacity, description: dto.description },
    });
  }

  async listRooms(clinicId: number, organizationId: number) {
    await this.getClinic(clinicId, organizationId);
    return this.prisma.room.findMany({ where: { clinicId }, orderBy: { name: 'asc' } });
  }
}
