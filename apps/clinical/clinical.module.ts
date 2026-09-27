import { Module } from '@nestjs/common';
import { PrismaModule } from '../api/prisma/prisma.module';
import { PatientsModule } from './patients/patients.module';
import { AppointmentsModule } from './appointments/appointments.module';

@Module({
  imports: [PrismaModule, PatientsModule, AppointmentsModule],
})
export class ClinicalModule {}