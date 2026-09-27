import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto';

@ApiTags('lab')
@Controller('lab/reports')
export class ReportsController {
  constructor(@Inject(ReportsService) private readonly reportsService: ReportsService) {}

  @Post()
  createReport(@Body() dto: CreateReportDto) {
    return this.reportsService.createReport(dto.organizationId, dto);
  }

  @Get('patient/:patientId')
  listReports(@Query('organizationId') organizationId: number, @Query('patientId') patientId: number) {
    return this.reportsService.listReports(organizationId, patientId);
  }

  @Get('patient/:patientId/report/:reportId')
  getReport(@Query('organizationId') organizationId: number, @Param('patientId') patientId: number, @Param('reportId') reportId: number) {
    return this.reportsService.getReport(organizationId, patientId, reportId);
  }

  @Put('patient/:patientId/report/:reportId/status')
  updateStatus(@Query('organizationId') organizationId: number, @Param('patientId') patientId: number, @Param('reportId') reportId: number, @Body('status') status: string) {
    return this.reportsService.updateReportStatus(organizationId, patientId, reportId, status);
  }
}