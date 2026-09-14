import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OrgId, Permissions } from '../common/decorators';
import { TreatmentsService } from './treatments.service';
import {
  AddSessionDto,
  CreatePackageDto,
  CreateTreatmentPlanDto,
  PurchasePackageDto,
  SetSessionStatusDto,
} from './dto';

@ApiTags('treatments')
@ApiBearerAuth()
@Controller()
export class TreatmentsController {
  constructor(private readonly treatments: TreatmentsService) {}

  @Permissions('treatment.manage')
  @Post('treatment-plans')
  createPlan(@OrgId() orgId: number, @Body() dto: CreateTreatmentPlanDto) {
    return this.treatments.createPlan(orgId, dto);
  }

  @Permissions('treatment.read')
  @Get('treatment-plans')
  listPlans(
    @OrgId() orgId: number,
    @Query('patientId') patientId?: string,
    @Query('doctorId') doctorId?: string,
    @Query('type') type?: string,
  ) {
    return this.treatments.listPlans(
      orgId,
      patientId ? Number(patientId) : undefined,
      doctorId ? Number(doctorId) : undefined,
      type,
    );
  }

  @Permissions('treatment.read')
  @Get('treatment-plans/:id')
  getPlan(@Param('id', ParseIntPipe) id: number, @OrgId() orgId: number) {
    return this.treatments.getPlan(id, orgId);
  }

  @Permissions('treatment.manage')
  @Post('treatment-plans/:id/sessions')
  addSession(@Param('id', ParseIntPipe) id: number, @OrgId() orgId: number, @Body() dto: AddSessionDto) {
    return this.treatments.addSession(id, orgId, dto);
  }

  @Permissions('treatment.manage')
  @Patch('treatment-plans/:id/sessions/:sessionNumber')
  setSessionStatus(
    @Param('id', ParseIntPipe) id: number,
    @Param('sessionNumber', ParseIntPipe) sessionNumber: number,
    @OrgId() orgId: number,
    @Body() dto: SetSessionStatusDto,
  ) {
    return this.treatments.setSessionStatus(id, sessionNumber, orgId, dto);
  }

  @Permissions('treatment.manage')
  @Post('packages')
  createPackage(@OrgId() orgId: number, @Body() dto: CreatePackageDto) {
    return this.treatments.createPackage(orgId, dto);
  }

  @Permissions('treatment.read')
  @Get('packages')
  listPackages(@OrgId() orgId: number) {
    return this.treatments.listPackages(orgId);
  }

  @Permissions('treatment.manage')
  @Post('package-purchases')
  purchasePackage(@OrgId() orgId: number, @Body() dto: PurchasePackageDto) {
    return this.treatments.purchasePackage(orgId, dto);
  }

  @Permissions('treatment.manage')
  @Post('package-purchases/:id/use-next')
  useNextSession(@Param('id', ParseIntPipe) id: number, @OrgId() orgId: number) {
    return this.treatments.useNextSession(id, orgId);
  }
}
