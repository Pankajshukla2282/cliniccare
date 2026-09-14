import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SuperAdminGuard } from '../common/guards';
import { TenantsService } from './tenants.service';
import { ActivateTenantDto, UpdateTenantDto } from './tenants.dto';

@ApiTags('tenants')
@ApiBearerAuth()
@UseGuards(SuperAdminGuard)
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @Get()
  list(
    @Query('status') status?: string,
    @Query('plan') plan?: string,
    @Query('search') search?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.tenants.list({
      status,
      plan,
      search,
      skip: Number(skip ?? 0),
      take: Number(take ?? 20),
    });
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.tenants.get(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTenantDto) {
    return this.tenants.update(id, dto);
  }

  @Post(':id/activate')
  activate(@Param('id', ParseIntPipe) id: number, @Body() dto?: ActivateTenantDto) {
    return this.tenants.activate(id, dto);
  }

  @Post(':id/suspend')
  suspend(@Param('id', ParseIntPipe) id: number) {
    return this.tenants.suspend(id);
  }
}