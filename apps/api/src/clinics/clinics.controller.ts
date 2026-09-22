import { Body, Controller, Get, Inject, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, OrgId, Permissions, RequestUser } from '../common/decorators';
import { ClinicsService } from './clinics.service';
import { CreateClinicDto, CreateHolidayDto, CreateOrganizationDto, CreateRoomDto, UpdateClinicDto } from './dto';

@ApiTags('clinics')
@ApiBearerAuth()
@Controller()
export class ClinicsController {
  constructor(@Inject(ClinicsService) private readonly clinics: ClinicsService) {}

  @Permissions('org.manage')
  @Post('organizations')
  createOrganization(@Body() dto: CreateOrganizationDto) {
    return this.clinics.createOrganization(dto);
  }

  @Permissions('org.read')
  @Get('organizations')
  listOrganizations() {
    return this.clinics.listOrganizations();
  }

  @Permissions('clinic.manage')
  @Post('clinics')
  createClinic(@OrgId() orgId: number, @Body() dto: CreateClinicDto) {
    return this.clinics.createClinic(orgId, dto);
  }

  @Permissions('clinic.read')
  @Get('clinics')
  listClinics(@OrgId() orgId: number) {
    return this.clinics.listClinics(orgId);
  }

  @Permissions('clinic.read')
  @Get('clinics/:id')
  getClinic(@Param('id', ParseIntPipe) id: number, @OrgId() orgId: number) {
    return this.clinics.getClinic(id, orgId);
  }

  @Permissions('clinic.manage')
  @Patch('clinics/:id')
  updateClinic(@Param('id', ParseIntPipe) id: number, @OrgId() orgId: number, @Body() dto: UpdateClinicDto) {
    return this.clinics.updateClinic(id, orgId, dto);
  }

  @Permissions('clinic.manage')
  @Post('clinics/:id/holidays')
  addHoliday(@Param('id', ParseIntPipe) id: number, @OrgId() orgId: number, @Body() dto: CreateHolidayDto) {
    return this.clinics.addHoliday(id, orgId, dto);
  }

  @Permissions('clinic.read')
  @Get('clinics/:id/holidays')
  listHolidays(@Param('id', ParseIntPipe) id: number, @OrgId() orgId: number) {
    return this.clinics.listHolidays(id, orgId);
  }

  @Permissions('clinic.manage')
  @Post('clinics/:id/rooms')
  createRoom(@Param('id', ParseIntPipe) id: number, @OrgId() orgId: number, @Body() dto: CreateRoomDto) {
    return this.clinics.createRoom(id, orgId, dto);
  }

  @Permissions('clinic.read')
  @Get('clinics/:id/rooms')
  listRooms(@Param('id', ParseIntPipe) id: number, @OrgId() orgId: number) {
    return this.clinics.listRooms(id, orgId);
  }
}
