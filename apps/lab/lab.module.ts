import { Module } from '@nestjs/common';
import { PrismaModule } from '../api/prisma/prisma.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [PrismaModule, ReportsModule],
})
export class LabModule {}