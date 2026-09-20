import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AppointmentStatus } from '../generated/prisma/client';
import { CurrentUser, OrgId, Permissions, Public, RequestUser, RequireIdempotency } from '../common/decorators';
import { AppointmentsService } from './appointments.service';
import { BookAppointmentDto, CancelAppointmentDto, RescheduleAppointmentDto, SlotQueryDto, UpdateAppointmentStatusDto } from './dto';

@ApiTags('appointments')
@ApiBearerAuth()
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Permissions('appointment.read')
  @Get()
  list(
    @OrgId() orgId: number,
    @Query('doctorId') doctorId?: string,
    @Query('patientId') patientId?: string,
    @Query('clinicId') clinicId?: string,
    @Query('date') date?: string,
    @Query('status') status?: AppointmentStatus,
  ) {
    return this.appointments.list(orgId, {
      doctorId: doctorId ? Number(doctorId) : undefined,
      patientId: patientId ? Number(patientId) : undefined,
      clinicId: clinicId ? Number(clinicId) : undefined,
      date,
      status,
    });
  }

  @Permissions('appointment.manage')
  @RequireIdempotency()
  @Post()
  book(@OrgId() orgId: number, @Body() dto: BookAppointmentDto, @CurrentUser() user: RequestUser) {
    return this.appointments.book(orgId, dto, user.sub);
  }

  @Permissions('appointment.manage')
  @Patch(':id/status')
  setStatus(
    @Param('id', ParseIntPipe) id: number,
    @OrgId() orgId: number,
    @Body() dto: UpdateAppointmentStatusDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.appointments.setStatus(id, orgId, dto, user.sub);
  }

  @Permissions('appointment.manage')
  @Patch(':id/reschedule')
  reschedule(
    @Param('id', ParseIntPipe) id: number,
    @OrgId() orgId: number,
    @Body() dto: RescheduleAppointmentDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.appointments.reschedule(id, orgId, dto, user.sub);
  }

  @Permissions('appointment.manage')
  @Delete(':id')
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @OrgId() orgId: number,
    @Body() dto: CancelAppointmentDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.appointments.cancel(id, orgId, dto, user.sub);
  }

  @Public()
  @Get('slots')
  availableSlots(
    @Query('organizationId', ParseIntPipe) organizationId: number,
    @Query('doctorId') doctorId: string,
    @Query('date') date: string,
    @Query('serviceId') serviceId?: string,
  ) {
    return this.appointments.availableSlots(organizationId, Number(doctorId), date, serviceId ? Number(serviceId) : undefined);
  }
}
