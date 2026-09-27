import { Module } from '@nestjs/common';
import { PrismaService } from '../api/prisma/prisma.service';
import { PatientsController } from './patients/patients.controller';
import { PatientsService } from './patients/patients.service';

@Module({
  controllers: [PatientsController],
  providers: [PatientsService],
  exports: [PatientsService],
})
export class PatientsModule {}