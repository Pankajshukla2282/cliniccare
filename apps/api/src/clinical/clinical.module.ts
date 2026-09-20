import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ClinicalController } from './clinical.controller';
import { ClinicalService } from './clinical.service';
@Module({ imports:[AuditModule], controllers:[ClinicalController], providers:[ClinicalService], exports:[ClinicalService] })
export class ClinicalModule {}
