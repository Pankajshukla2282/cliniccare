import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../api/prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async createReport(organizationId: number, dto: { patientId: number; consultationId?: number; doctorId?: number; testName: string; labName?: string; result?: string; units?: string; referenceRange?: string }) {
    const { patientId, consultationId, doctorId, testName, labName, result, units, referenceRange } = dto;

    return this.prisma.labReport.create({
      data: {
        organizationId,
        patientId,
        consultationId,
        doctorId,
        testName,
        labName,
        result,
        units,
        referenceRange,
        status: 'ORDERED',
      },
    });
  }

  async getReport(organizationId: number, patientId: number, reportId: number) {
    return this.prisma.labReport.findFirst({
      where: { id: reportId, organizationId, patientId },
      include: { patient: true, consultation: true, doctor: true },
    });
  }

  async listReports(organizationId: number, patientId?: number) {
    return this.prisma.labReport.findMany({
      where: {
        organizationId,
        ...(patientId ? { patientId } : {}),
      },
      include: { patient: true, consultation: true, doctor: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateReportStatus(organizationId: number, patientId: number, reportId: number, status: string) {
    return this.prisma.labReport.update({
      where: { id: reportId, organizationId, patientId },
      data: { status },
    });
  }
}