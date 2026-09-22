import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OrgId, Permissions } from '../common/decorators';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(@Inject(ReportsService) private readonly reports: ReportsService) {}

  @Permissions('report.view')
  @Get('dashboard')
  dashboard(@OrgId() orgId: number) {
    return this.reports.dashboard(orgId);
  }

  @Permissions('report.view')
  @Get('doctor-revenue')
  doctorRevenue(@OrgId() orgId: number, @Query('doctorId') doctorId: string, @Query('days') days?: string) {
    return this.reports.doctorRevenue(orgId, Number(doctorId), days ? Number(days) : 30);
  }

  @Permissions('report.view')
  @Get('product-sales')
  productSales(@OrgId() orgId: number, @Query('days') days?: string) {
    return this.reports.productSales(orgId, days ? Number(days) : 30);
  }

  @Permissions('report.view')
  @Get('package-utilization')
  packageUtilization(@OrgId() orgId: number) {
    return this.reports.packageUtilization(orgId);
  }

  @Permissions('report.view')
  @Get('appointment-report')
  appointmentReport(
    @OrgId() orgId: number,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reports.appointmentReport(orgId, from, to);
  }

  @Permissions('report.view')
  @Get('service-revenue')
  serviceRevenue(@OrgId() orgId: number, @Query('days') days?: string) {
    return this.reports.serviceRevenue(orgId, days ? Number(days) : 30);
  }

  @Permissions('report.view')
  @Get('patient-acquisition')
  patientAcquisition(@OrgId() orgId: number, @Query('days') days?: string) {
    return this.reports.patientAcquisition(orgId, days ? Number(days) : 30);
  }

  @Permissions('report.view')
  @Get('inventory')
  inventoryReport(@OrgId() orgId: number) {
    return this.reports.inventoryReport(orgId);
  }

  @Permissions('report.view')
  @Get('payments')
  paymentReport(@OrgId() orgId: number, @Query('days') days?: string) {
    return this.reports.paymentReport(orgId, days ? Number(days) : 30);
  }
}
