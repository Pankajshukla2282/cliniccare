import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDocumentDto, RecordConsentDto } from './dto';

@Injectable()
export class DocumentsService {
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

  async create(organizationId: number, dto: CreateDocumentDto) {
    if (dto.patientId) await this.assertPatientInOrg(dto.patientId, organizationId);
    if (dto.consultationId) {
      const consultation = await this.prisma.consultation.findFirst({
        where: { id: dto.consultationId, patient: { organizationId } },
      });
      if (!consultation) throw new NotFoundException('Consultation not found');
    }
    if (dto.ownerType === 'PATIENT') await this.assertPatientInOrg(dto.ownerId, organizationId);
    return this.prisma.document.create({ data: dto });
  }

  listByPatient(organizationId: number, patientId: number) {
    return this.prisma.document.findMany({
      where: { patientId, patient: { organizationId } },
      include: { consent: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async recordConsent(organizationId: number, dto: RecordConsentDto) {
    await this.assertPatientInOrg(dto.patientId, organizationId);
    if (dto.documentId) {
      const doc = await this.prisma.document.findFirst({
        where: { id: dto.documentId, patient: { organizationId } },
      });
      if (!doc) throw new NotFoundException('Document not found');
    }
    const consent = await this.prisma.consent.create({ data: dto });
    if (dto.documentId && dto.given) {
      try {
        await this.prisma.document.updateMany({
          where: { id: dto.documentId, patient: { organizationId } },
          data: { consentGiven: true, consentGivenAt: new Date() },
        });
      } catch {
        // Flag update is best-effort
      }
    }
    return consent;
  }

  listConsents(organizationId: number, patientId: number) {
    return this.prisma.consent.findMany({
      where: { patientId, patient: { organizationId } },
      include: { document: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(id: number, organizationId: number) {
    const doc = await this.prisma.document.findFirst({ where: { id, patient: { organizationId } }, include: { consent: true } });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  async createVersion(parentId: number, organizationId: number, dto: CreateDocumentDto) {
    const parent = await this.prisma.document.findFirst({ where: { id: parentId, patient: { organizationId } } });
    if (!parent) throw new NotFoundException('Parent document not found');
    const version = parent.version + 1;
    return this.prisma.document.create({
      data: {
        ...dto,
        patientId: parent.patientId,
        version,
        consentRequired: parent.consentRequired,
      },
    });
  }

  async withdrawConsent(consentId: number, organizationId: number, reason?: string) {
    const consent = await this.prisma.consent.findFirst({ where: { id: consentId, patient: { organizationId } } });
    if (!consent) throw new NotFoundException('Consent not found');
    return this.prisma.consent.update({
      where: { id: consentId },
      data: { given: false, notes: reason ? `WITHDRAWN: ${reason}` : 'WITHDRAWN' },
    });
  }

  listByType(organizationId: number, patientId: number, type: string) {
    return this.prisma.document.findMany({
      where: { patientId, patient: { organizationId }, type: type as any },
      orderBy: { createdAt: 'desc' },
    });
  }
}
