import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../api/prisma/prisma.service';

@Injectable()
export class TicketsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(organizationId: number, dto: { patientId: number; clinicId: number; serviceId?: number }) {
    const { patientId, clinicId, serviceId } = dto;

    // Get next token number
    const lastTicket = await this.prisma.queueTicket.findFirst({
      where: { clinicId },
      orderBy: { tokenNumber: 'desc' },
    });

    const nextTokenNumber = lastTicket ? lastTicket.tokenNumber + 1 : 1;

    return this.prisma.queueTicket.create({
      data: {
        organizationId,
        clinicId,
        patientId,
        tokenNumber: nextTokenNumber,
        queueType: 'CONSULTATION',
        serviceId,
      },
    });
  }

  async get(clinicId: number, tokenNumber: number) {
    return this.prisma.queueTicket.findFirst({
      where: { clinicId, tokenNumber },
    });
  }

  async list(clinicId: number, status?: string) {
    return this.prisma.queueTicket.findMany({
      where: { clinicId, ...(status ? { status } : {} ) },
      orderBy: { tokenNumber: 'asc' },
    });
  }

  async updateStatus(clinicId: number, tokenNumber: number, status: string) {
    return this.prisma.queueTicket.update({
      where: { clinicId, tokenNumber },
      data: { status },
    });
  }
}