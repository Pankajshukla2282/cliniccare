import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OrgId, Permissions } from '../common/decorators';
import { DoctorsService } from './doctors.service';
import {
  AssignSpecialtyDto,
  CreateLeaveDto,
  CreateSpecialtyDto,
  LinkServiceDto,
  UpdateDoctorDto,
  UpsertScheduleDto,
} from './dto';

@ApiTags('doctors')
@ApiBearerAuth()
@Controller()
export class DoctorsController {
  constructor(private readonly doctors: DoctorsService) {}

  @Permissions('doctor.read')
  @Get('doctors')
  list(@OrgId() orgId: number, @Query('clinicId') clinicId?: string, @Query('status') status?: string) {
    return this.doctors.list(orgId, clinicId ? Number(clinicId) : undefined, status);
  }

  @Permissions('doctor.read')
  @Get('doctors/:id')
  get(@Param('id', ParseIntPipe) id: number, @OrgId() orgId: number) {
    return this.doctors.get(id, orgId);
  }

  @Permissions('doctor.manage')
  @Patch('doctors/:id')
  update(@Param('id', ParseIntPipe) id: number, @OrgId() orgId: number, @Body() dto: UpdateDoctorDto) {
    return this.doctors.update(id, orgId, dto);
  }

  @Permissions('doctor.manage')
  @Post('specialties')
  createSpecialty(@Body() dto: CreateSpecialtyDto) {
    return this.doctors.createSpecialty(dto);
  }

  @Permissions('doctor.read')
  @Get('specialties')
  listSpecialties() {
    return this.doctors.listSpecialties();
  }

  @Permissions('doctor.manage')
  @Post('doctors/:id/specialties')
  assignSpecialty(@Param('id', ParseIntPipe) id: number, @OrgId() orgId: number, @Body() dto: AssignSpecialtyDto) {
    return this.doctors.assignSpecialty(id, orgId, dto);
  }

  @Permissions('doctor.manage')
  @Post('doctors/:id/schedules')
  upsertSchedule(@Param('id', ParseIntPipe) id: number, @OrgId() orgId: number, @Body() dto: UpsertScheduleDto) {
    return this.doctors.upsertSchedule(id, orgId, dto);
  }

  @Permissions('doctor.read')
  @Get('doctors/:id/schedules')
  listSchedules(@Param('id', ParseIntPipe) id: number, @OrgId() orgId: number) {
    return this.doctors.listSchedules(id, orgId);
  }

  @Permissions('doctor.manage')
  @Post('doctors/:id/leaves')
  addLeave(@Param('id', ParseIntPipe) id: number, @OrgId() orgId: number, @Body() dto: CreateLeaveDto) {
    return this.doctors.addLeave(id, orgId, dto);
  }

  @Permissions('doctor.manage')
  @Post('doctors/:id/services')
  linkService(@Param('id', ParseIntPipe) id: number, @OrgId() orgId: number, @Body() dto: LinkServiceDto) {
    return this.doctors.linkService(id, orgId, dto);
  }
}
