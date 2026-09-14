import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateImageDto, CreateSkinAssessmentDto, RecommendProductDto } from './dto';

@Injectable()
export class SkinService {
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

  async createAssessment(organizationId: number, dto: CreateSkinAssessmentDto) {
    await this.assertPatientInOrg(dto.patientId, organizationId);
    if (dto.consultationId) {
      const consultation = await this.prisma.consultation.findFirst({
        where: { id: dto.consultationId, patient: { organizationId } },
      });
      if (!consultation) throw new NotFoundException('Consultation not found');
    }
    if (dto.treatmentPlanId) {
      const plan = await this.prisma.treatmentPlan.findFirst({
        where: { id: dto.treatmentPlanId, patient: { organizationId } },
      });
      if (!plan) throw new NotFoundException('Treatment plan not found');
    }
    return this.prisma.skinAssessment.create({
      data: {
        patientId: dto.patientId,
        consultationId: dto.consultationId,
        treatmentPlanId: dto.treatmentPlanId,
        skinType: dto.skinType,
        concerns: dto.concerns ?? [],
        severity: dto.severity,
        assessmentDate: new Date(dto.assessmentDate),
        recommendations: dto.recommendations,
      },
    });
  }

  listAssessments(organizationId: number, patientId: number) {
    return this.prisma.skinAssessment.findMany({
      where: { patientId, patient: { organizationId } },
      orderBy: { assessmentDate: 'desc' },
    });
  }

  async addImage(organizationId: number, dto: CreateImageDto) {
    await this.assertPatientInOrg(dto.patientId, organizationId);
    if (dto.treatmentPlanId) {
      const plan = await this.prisma.treatmentPlan.findFirst({
        where: { id: dto.treatmentPlanId, patient: { organizationId } },
      });
      if (!plan) throw new NotFoundException('Treatment plan not found');
    }
    if (dto.consultationId) {
      const consultation = await this.prisma.consultation.findFirst({
        where: { id: dto.consultationId, patient: { organizationId } },
      });
      if (!consultation) throw new NotFoundException('Consultation not found');
    }
    return this.prisma.beforeAfterImage.create({
      data: {
        patientId: dto.patientId,
        treatmentPlanId: dto.treatmentPlanId,
        consultationId: dto.consultationId,
        bodyArea: dto.bodyArea,
        imageType: dto.imageType,
        storagePath: dto.storagePath,
        fileName: dto.fileName,
        mimeType: dto.mimeType,
        capturedAt: dto.capturedAt ? new Date(dto.capturedAt) : new Date(),
        doctorNotes: dto.doctorNotes,
        patientConsent: dto.patientConsent ?? false,
      },
    });
  }

  listImages(organizationId: number, patientId: number, treatmentPlanId?: number) {
    return this.prisma.beforeAfterImage.findMany({
      where: { patientId, patient: { organizationId }, ...(treatmentPlanId ? { treatmentPlanId } : {}) },
      orderBy: { capturedAt: 'asc' },
    });
  }

  async recommendProduct(organizationId: number, dto: RecommendProductDto) {
    await this.assertPatientInOrg(dto.patientId, organizationId);
    const doctor = await this.prisma.doctor.findFirst({
      where: { id: dto.doctorId, clinic: { organizationId } },
    });
    if (!doctor) throw new NotFoundException('Doctor not found');
    const product = await this.prisma.product.findFirst({ where: { id: dto.productId, organizationId } });
    if (!product) throw new NotFoundException('Product not found');
    if (dto.consultationId) {
      const consultation = await this.prisma.consultation.findFirst({
        where: { id: dto.consultationId, patient: { organizationId } },
      });
      if (!consultation) throw new NotFoundException('Consultation not found');
    }
    return this.prisma.doctorRecommendation.create({ data: dto });
  }

  listRecommendations(organizationId: number, patientId: number) {
    return this.prisma.doctorRecommendation.findMany({
      where: { patientId, patient: { organizationId } },
      include: { product: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
