import { Body, Controller, Get, Post, Param } from '@nestjs/common';
import { ApiTags, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { TicketsService } from './tickets.service';

@ApiTags('queue')
@Controller('queue/tickets')
export class TicketsController {
  constructor(@Inject(TicketsService) private readonly ticketsService: TicketsService) {}

  @Post()
  create(@Body() dto: { organizationId: number; patientId: number; clinicId: number; serviceId?: number }) {
    return this.ticketsService.create(dto.organizationId, dto);
  }

  @Get('clinic/:clinicId')
  list(@Query('clinicId') clinicId: number, @Query('status') status?: string) {
    return this.ticketsService.list(clinicId, status);
  }

  @Get(':clinicId/:tokenNumber')
  get(@Param('clinicId') clinicId: number, @Param('tokenNumber') tokenNumber: number) {
    return this.ticketsService.get(clinicId, tokenNumber);
  }

  @Put(':clinicId/:tokenNumber')
  updateStatus(@Param('clinicId') clinicId: number, @Param('tokenNumber') tokenNumber: number, @Body('status') status: string) {
    return this.ticketsService.updateStatus(clinicId, tokenNumber, status);
  }
}