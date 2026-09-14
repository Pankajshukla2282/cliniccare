import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AssignRoleDto, CreateUserDto, UpdateUserDto } from './dto';

function patientNumber(): string {
  return `P-${randomBytes(4).toString('hex').toUpperCase()}`;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: number, skip = 0, take = 20) {
    return this.prisma.user.findMany({
      where: { organizationId },
      skip,
      take: Math.min(take, 100),
      orderBy: { id: 'asc' },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        primaryRole: true, status: true, clinicId: true, createdAt: true,
      },
    });
  }

  async create(orgId: number, dto: CreateUserDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new BadRequestException('Email already registered');
    if (dto.clinicId !== undefined && dto.clinicId !== null) {
      const clinic = await this.prisma.clinic.findFirst({ where: { id: dto.clinicId, organizationId: orgId } });
      if (!clinic) throw new NotFoundException('Clinic not found');
    }
    const user = await this.prisma.user.create({
      data: {
        organizationId: orgId,
        clinicId: dto.clinicId,
        email: dto.email,
        passwordHash: await bcrypt.hash(dto.password, 10),
        firstName: dto.firstName,
        lastName: dto.lastName,
        primaryRole: dto.role,
      },
    });
    if (dto.role === 'PATIENT') {
      await this.prisma.patient.create({
        data: { userId: user.id, organizationId: orgId, patientNumber: patientNumber() },
      });
    } else if (dto.role === 'DOCTOR') {
      await this.prisma.doctor.create({ data: { userId: user.id, clinicId: dto.clinicId } });
    }
    return user;
  }

  async get(id: number, organizationId?: number) {
    const user = await this.prisma.user.findUnique({
      where: organizationId !== undefined ? { id, organizationId } : { id },
      include: { roles: true, patient: true, doctor: true },
    });
    if (!user) throw new NotFoundException('User not found');
    const { passwordHash: _ph, ...rest } = user;
    return rest;
  }

  async update(id: number, organizationId: number, dto: UpdateUserDto) {
    await this.get(id, organizationId);
    return this.prisma.user.update({ where: { id }, data: dto });
  }

  async assignRole(id: number, organizationId: number, dto: AssignRoleDto) {
    await this.get(id, organizationId);
    await this.prisma.userRole.upsert({
      where: { userId_role: { userId: id, role: dto.role } },
      create: { userId: id, role: dto.role },
      update: {},
    });
    return this.get(id, organizationId);
  }
}
