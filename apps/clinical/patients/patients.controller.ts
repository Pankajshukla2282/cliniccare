import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { PatientsService } from './patients.service';
import { CreatePatientDto, UpdatePatientDto } from './dto';

@ApiTags('clinical')
@Controller('clinical/patients')
export class PatientsController {
  constructor(@Inject(PatientsService) private readonly patientsService: PatientsService) {}

  @Post()
  create(@Body() dto: CreatePatientDto) {
    return this.patientsService.create(dto.organizationId, dto);
  }

  @Get()
  list(@Query('organizationId') organizationId: number, @Query('search') search?: string, @Query('skip') skip = 0, @Query('take') take = 20) {
    return this.patientsService.list(organizationId, search, skip, take);
  }

  @Get(':id')
  async get(@Param('id') id: number, @Query('organizationId') organizationId: number) {
    return this.patientsService.get(id, organizationId);
  }

  @Put(':id')
  async update(@Param('id') id: number, @Query('organizationId') organizationId: number, @Body() dto: UpdatePatientDto) {
    return this.patientsService.update(id, organizationId, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: number, @Query('organizationId') organizationId: number) {
    await this.prisma.patient.delete({ where: { id, organizationId } });
    return { deleted: true };
  }
}