import { Body, Controller, Get, Inject, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OrgId, Permissions } from '../common/decorators';
import { CreatePatientDto, UpdatePatientDto } from './dto';
import { PatientsService } from './patients.service';

@ApiTags('patients')
@ApiBearerAuth()
@Controller('patients')
export class PatientsController {
  constructor(@Inject(PatientsService) private readonly patients: PatientsService) {}

  @Permissions('patient.manage')
  @Post()
  create(@OrgId() orgId: number, @Body() dto: CreatePatientDto) {
    return this.patients.create(orgId, dto);
  }

  @Permissions('patient.read')
  @Get()
  list(
    @OrgId() orgId: number,
    @Query('search') search?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.patients.list(orgId, search, Number(skip ?? 0), Number(take ?? 20));
  }

  @Permissions('patient.read')
  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number, @OrgId() orgId: number) {
    return this.patients.get(id, orgId);
  }

  @Permissions('patient.manage')
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @OrgId() orgId: number, @Body() dto: UpdatePatientDto) {
    return this.patients.update(id, orgId, dto);
  }

  @Permissions('patient.read')
  @Get(':id/dashboard')
  dashboard(@Param('id', ParseIntPipe) id: number, @OrgId() orgId: number) {
    return this.patients.dashboard(id, orgId);
  }
}
