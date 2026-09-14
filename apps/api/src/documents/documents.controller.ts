import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OrgId, Permissions } from '../common/decorators';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto, RecordConsentDto, WithdrawConsentDto } from './dto';

@ApiTags('documents')
@ApiBearerAuth()
@Controller()
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Permissions('document.manage')
  @Post('documents')
  create(@OrgId() orgId: number, @Body() dto: CreateDocumentDto) {
    return this.documents.create(orgId, dto);
  }

  @Permissions('document.read')
  @Get('documents')
  listByPatient(@OrgId() orgId: number, @Query('patientId', ParseIntPipe) patientId: number) {
    return this.documents.listByPatient(orgId, patientId);
  }

  @Permissions('document.read')
  @Get('documents/:id')
  get(@Param('id', ParseIntPipe) id: number, @OrgId() orgId: number) {
    return this.documents.get(id, orgId);
  }

  @Permissions('document.manage')
  @Post('consents')
  recordConsent(@OrgId() orgId: number, @Body() dto: RecordConsentDto) {
    return this.documents.recordConsent(orgId, dto);
  }

  @Permissions('document.read')
  @Get('consents')
  listConsents(@OrgId() orgId: number, @Query('patientId', ParseIntPipe) patientId: number) {
    return this.documents.listConsents(orgId, patientId);
  }

  @Permissions('document.manage')
  @Post('documents/:id/versions')
  createVersion(@Param('id', ParseIntPipe) id: number, @OrgId() orgId: number, @Body() dto: CreateDocumentDto) {
    return this.documents.createVersion(id, orgId, dto);
  }

  @Permissions('document.manage')
  @Patch('consents/:id/withdraw')
  withdrawConsent(@Param('id', ParseIntPipe) id: number, @OrgId() orgId: number, @Body() dto: WithdrawConsentDto) {
    return this.documents.withdrawConsent(id, orgId, dto.reason);
  }

  @Permissions('document.read')
  @Get('documents/type/:type')
  listByType(@OrgId() orgId: number, @Query('patientId', ParseIntPipe) patientId: number, @Param('type') type: string) {
    return this.documents.listByType(orgId, patientId, type);
  }
}
