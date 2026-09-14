import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateConsultationDto,
  CreateMedicalRecordDto,
  CreatePrescriptionDto,
  CreatePrescriptionTemplateDto,
  PrescriptionFromTemplateDto,
  ReusePrescriptionDto,
  UpdateConsultationDto,
} from './dto';

@Injectable()
export class ClinicalService {
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

  private async assertConsultationInOrg(consultationId: number, organizationId: number) {
    const consultation = await this.prisma.consultation.findFirst({
      where: { id: consultationId, patient: { organizationId } },
      select: { id: true },
    });
    if (!consultation) throw new NotFoundException('Consultation not found');
  }

  async createConsultation(organizationId: number, dto: CreateConsultationDto) {
    await this.assertPatientInOrg(dto.patientId, organizationId);
    await this.assertDoctorInOrg(dto.doctorId, organizationId);
    if (dto.clinicId) {
      const clinic = await this.prisma.clinic.findFirst({ where: { id: dto.clinicId, organizationId } });
      if (!clinic) throw new NotFoundException('Clinic not found');
    }
    if (dto.appointmentId) {
      const appointment = await this.prisma.appointment.findFirst({
        where: { id: dto.appointmentId, patient: { organizationId } },
        select: { id: true },
      });
      if (!appointment) throw new NotFoundException('Appointment not found');
    }
    const consultation = await this.prisma.consultation.create({
      data: {
        patientId: dto.patientId,
        doctorId: dto.doctorId,
        clinicId: dto.clinicId,
        appointmentId: dto.appointmentId,
        consultationType: dto.consultationType ?? 'IN_PERSON',
        chiefComplaint: dto.chiefComplaint,
        symptoms: dto.symptoms,
        history: dto.history,
        bloodPressure: dto.bloodPressure,
        heartRate: dto.heartRate,
        temperature: dto.temperature,
        weight: dto.weight,
        height: dto.height,
        assessment: dto.assessment,
        diagnosis: dto.diagnosis,
        treatmentPlanText: dto.treatmentPlanText,
        examination: dto.examination,
        investigations: dto.investigations,
        advice: dto.advice,
        followUpDate: dto.followUpDate ? new Date(dto.followUpDate) : undefined,
        durationMinutes: dto.durationMinutes,
        notes: dto.notes,
      },
    });
    if (dto.appointmentId) {
      try {
        await this.prisma.appointment.updateMany({
          where: { id: dto.appointmentId, patient: { organizationId } },
          data: { status: 'COMPLETED' },
        });
        await this.prisma.appointmentStatusHistory.create({
          data: { appointmentId: dto.appointmentId, toStatus: 'COMPLETED', note: 'Consultation recorded' },
        });
      } catch {
        // Appointment linkage is best-effort
      }
    }
    return consultation;
  }

  listConsultations(organizationId: number, patientId?: number, doctorId?: number) {
    return this.prisma.consultation.findMany({
      where: {
        patient: { organizationId },
        ...(patientId ? { patientId } : {}),
        ...(doctorId ? { doctorId } : {}),
      },
      include: { patient: { select: { patientNumber: true } }, doctor: { select: { qualification: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getConsultation(id: number, organizationId: number) {
    const consultation = await this.prisma.consultation.findFirst({
      where: { id, patient: { organizationId } },
      include: {
        prescriptions: { include: { items: true } },
        documents: true,
        skinAssessments: true,
        recommendations: { include: { product: true } },
      },
    });
    if (!consultation) throw new NotFoundException('Consultation not found');
    return consultation;
  }

  async updateConsultation(id: number, organizationId: number, dto: UpdateConsultationDto) {
    await this.getConsultation(id, organizationId);
    return this.prisma.consultation.update({ where: { id }, data: dto });
  }

  async createPrescription(organizationId: number, dto: CreatePrescriptionDto) {
    const { prescriptionItems, ...rest } = dto;
    await this.assertPatientInOrg(dto.patientId, organizationId);
    await this.assertDoctorInOrg(dto.doctorId, organizationId);
    if (dto.consultationId) await this.assertConsultationInOrg(dto.consultationId, organizationId);
    return this.prisma.prescription.create({
      data: {
        ...rest,
        items: prescriptionItems?.length
          ? { create: prescriptionItems.map((i) => ({ ...i, quantity: i.quantity ?? 1 })) }
          : undefined,
      },
      include: { items: true },
    });
  }

  listPrescriptions(organizationId: number, patientId?: number, doctorId?: number) {
    return this.prisma.prescription.findMany({
      where: {
        patient: { organizationId },
        ...(patientId ? { patientId } : {}),
        ...(doctorId ? { doctorId } : {}),
      },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createMedicalRecord(organizationId: number, dto: CreateMedicalRecordDto) {
    await this.assertPatientInOrg(dto.patientId, organizationId);
    if (dto.doctorId) await this.assertDoctorInOrg(dto.doctorId, organizationId);
    return this.prisma.medicalRecord.create({
      data: {
        ...dto,
        details: (dto.details ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  }

  listMedicalRecords(organizationId: number, patientId: number, type?: string) {
    return this.prisma.medicalRecord.findMany({
      where: { patientId, patient: { organizationId }, ...(type ? { type } : {}) },
      orderBy: { recordedAt: 'desc' },
    });
  }

  createTemplate(organizationId: number, dto: CreatePrescriptionTemplateDto) {
    return this.prisma.prescriptionTemplate.upsert({
      where: { organizationId_name: { organizationId, name: dto.name } },
      create: {
        ...dto,
        organizationId,
        items: dto.items as unknown as Prisma.InputJsonValue,
      },
      update: {
        items: dto.items as unknown as Prisma.InputJsonValue,
        notes: dto.notes,
        doctorId: dto.doctorId,
      },
    });
  }

  listTemplates(organizationId: number, doctorId?: number) {
    return this.prisma.prescriptionTemplate.findMany({
      where: { organizationId, ...(doctorId ? { doctorId } : {}) },
      orderBy: { name: 'asc' },
    });
  }

  async createFromTemplate(organizationId: number, dto: PrescriptionFromTemplateDto) {
    const template = await this.prisma.prescriptionTemplate.findFirst({ where: { id: dto.templateId, organizationId } });
    if (!template) throw new NotFoundException('Template not found');
    await this.assertPatientInOrg(dto.patientId, organizationId);
    await this.assertDoctorInOrg(dto.doctorId, organizationId);
    if (dto.consultationId) await this.assertConsultationInOrg(dto.consultationId, organizationId);
    const items = template.items as unknown as {
      name: string;
      dosage?: string;
      frequency?: string;
      duration?: string;
      instructions?: string;
      quantity?: number;
      price?: number;
      productId?: number;
    }[];
    return this.prisma.prescription.create({
      data: {
        patientId: dto.patientId,
        doctorId: dto.doctorId,
        consultationId: dto.consultationId,
        title: template.name,
        instructions: template.notes,
        items: { create: items.map((i) => ({ ...i, quantity: i.quantity ?? 1 })) },
      },
      include: { items: true },
    });
  }

  async reusePrescription(organizationId: number, dto: ReusePrescriptionDto, doctorId: number, patientId?: number) {
    const source = await this.prisma.prescription.findFirst({
      where: { id: dto.sourcePrescriptionId, patient: { organizationId } },
      include: { items: true },
    });
    if (!source) throw new NotFoundException('Source prescription not found');
    if (patientId && patientId !== source.patientId) await this.assertPatientInOrg(patientId, organizationId);
    if (dto.consultationId) await this.assertConsultationInOrg(dto.consultationId, organizationId);
    return this.prisma.prescription.create({
      data: {
        patientId: patientId ?? source.patientId,
        doctorId,
        consultationId: dto.consultationId,
        title: source.title,
        instructions: source.instructions,
        notes: source.notes,
        items: {
          create: source.items.map((i) => ({
            productId: i.productId,
            name: i.name,
            dosage: i.dosage,
            frequency: i.frequency,
            duration: i.duration,
            instructions: i.instructions,
            quantity: i.quantity,
            price: i.price,
          })),
        },
      },
      include: { items: true },
    });
  }

  async createTeleRoom(consultationId: number, organizationId: number) {
    const consultation = await this.prisma.consultation.findFirst({ where: { id: consultationId, patient: { organizationId } } });
    if (!consultation) throw new NotFoundException('Consultation not found');
    const existing = await this.prisma.teleconsultation.findUnique({ where: { consultationId } });
    if (existing) return existing;
    // Video provider abstraction: STUB generates the room; a real provider
    // (Daily.co / Twilio / Jitsi) plugs in here without changing callers.
    const roomId = `room-${randomBytes(8).toString('hex')}`;
    const base = process.env.TELECONSULT_BASE_URL ?? 'https://meet.cliniccare.local/room';
    return this.prisma.teleconsultation.create({
      data: { consultationId, provider: 'STUB', roomId, joinUrl: `${base}/${roomId}` },
    });
  }

  async getTeleRoom(consultationId: number, organizationId: number) {
    await this.getConsultation(consultationId, organizationId);
    const room = await this.prisma.teleconsultation.findUnique({ where: { consultationId } });
    if (!room) throw new NotFoundException('No consultation room for this consultation');
    return room;
  }

  async setTeleStatus(consultationId: number, status: string) {
    if (!['SCHEDULED', 'LIVE', 'ENDED'].includes(status)) {
      throw new BadRequestException('Invalid room status');
    }
    return this.prisma.teleconsultation.update({
      where: { consultationId },
      data: {
        status,
        startedAt: status === 'LIVE' ? new Date() : undefined,
        endedAt: status === 'ENDED' ? new Date() : undefined,
      },
    });
  }
}
