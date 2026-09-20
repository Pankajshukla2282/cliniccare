import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, OrgId, Permissions, RequestUser, RequireIdempotency } from '../common/decorators';
import { ClinicalService } from './clinical.service';
import {
  CreateConsultationDto,
  CreateMedicalRecordDto,
  CreatePrescriptionDto,
  CreatePrescriptionTemplateDto,
  PrescriptionFromTemplateDto,
  ReusePrescriptionDto,
  UpdateConsultationDto,
} from './dto';

@ApiTags('clinical')
@ApiBearerAuth()
@Controller()
export class ClinicalController {
  constructor(private readonly clinical: ClinicalService) {}

  @Permissions('consultation.manage')
  @RequireIdempotency()
  @Post('consultations')
  createConsultation(@OrgId() orgId: number, @Body() dto: CreateConsultationDto) {
    return this.clinical.createConsultation(orgId, dto);
  }

  @Permissions('consultation.read')
  @Get('consultations')
  listConsultations(@OrgId() orgId: number, @Query('patientId') patientId?: string, @Query('doctorId') doctorId?: string) {
    return this.clinical.listConsultations(
      orgId,
      patientId ? Number(patientId) : undefined,
      doctorId ? Number(doctorId) : undefined,
    );
  }

  @Permissions('consultation.read')
  @Get('consultations/:id')
  getConsultation(@Param('id', ParseIntPipe) id: number, @OrgId() orgId: number) {
    return this.clinical.getConsultation(id, orgId);
  }

  @Permissions('consultation.manage')
  @Patch('consultations/:id')
  updateConsultation(@Param('id', ParseIntPipe) id: number, @OrgId() orgId: number, @Body() dto: UpdateConsultationDto) {
    return this.clinical.updateConsultation(id, orgId, dto);
  }

  @Permissions('prescription.manage')
  @RequireIdempotency()
  @Post('prescriptions')
  createPrescription(@OrgId() orgId: number, @Body() dto: CreatePrescriptionDto) {
    return this.clinical.createPrescription(orgId, dto);
  }

  @Permissions('prescription.read')
  @Get('prescriptions')
  listPrescriptions(@OrgId() orgId: number, @Query('patientId') patientId?: string, @Query('doctorId') doctorId?: string) {
    return this.clinical.listPrescriptions(
      orgId,
      patientId ? Number(patientId) : undefined,
      doctorId ? Number(doctorId) : undefined,
    );
  }

  @Permissions('medical_record.manage')
  @Post('medical-records')
  createMedicalRecord(@OrgId() orgId: number, @Body() dto: CreateMedicalRecordDto, @CurrentUser() user: RequestUser) {
    return this.clinical.createMedicalRecord(orgId, dto, user.sub);
  }

  @Permissions('medical_record.read')
  @Get('medical-records')
  listMedicalRecords(@OrgId() orgId: number, @Query('patientId', ParseIntPipe) patientId: number, @Query('type') type?: string) {
    return this.clinical.listMedicalRecords(orgId, patientId, type);
  }

  @Permissions('prescription.manage')
  @Post('prescription-templates')
  createTemplate(@OrgId() orgId: number, @Body() dto: CreatePrescriptionTemplateDto) {
    return this.clinical.createTemplate(orgId, dto);
  }

  @Permissions('prescription.read')
  @Get('prescription-templates')
  listTemplates(
    @OrgId() orgId: number,
    @Query('doctorId') doctorId?: string,
  ) {
    return this.clinical.listTemplates(orgId, doctorId ? Number(doctorId) : undefined);
  }

  @Permissions('prescription.manage')
  @Post('prescriptions/from-template')
  createFromTemplate(@OrgId() orgId: number, @Body() dto: PrescriptionFromTemplateDto) {
    return this.clinical.createFromTemplate(orgId, dto);
  }

  @Permissions('prescription.manage')
  @Post('prescriptions/reuse')
  reuse(
    @OrgId() orgId: number,
    @Body() dto: ReusePrescriptionDto,
    @CurrentUser() user: RequestUser,
    @Query('patientId') patientId?: string,
  ) {
    return this.clinical.reusePrescription(orgId, dto, user.sub, patientId ? Number(patientId) : undefined);
  }

  @Permissions('consultation.manage')
  @Post('consultations/:id/room')
  createTeleRoom(@Param('id', ParseIntPipe) id: number, @OrgId() orgId: number) {
    return this.clinical.createTeleRoom(id, orgId);
  }

  @Permissions('consultation.read')
  @Get('consultations/:id/room')
  getTeleRoom(@Param('id', ParseIntPipe) id: number, @OrgId() orgId: number) {
    return this.clinical.getTeleRoom(id, orgId);
  }
}
