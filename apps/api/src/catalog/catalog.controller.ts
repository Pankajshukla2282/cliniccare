import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OrgId, Permissions } from '../common/decorators';
import { CatalogService } from './catalog.service';
import { CreateServiceCategoryDto, CreateServiceDto, UpdateServiceDto } from './dto';

@ApiTags('catalog')
@ApiBearerAuth()
@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Permissions('service.manage')
  @Post('service-categories')
  createCategory(@OrgId() orgId: number, @Body() dto: CreateServiceCategoryDto) {
    return this.catalog.createCategory(orgId, dto);
  }

  @Permissions('service.read')
  @Get('service-categories')
  listCategories(@OrgId() orgId: number) {
    return this.catalog.listCategories(orgId);
  }

  @Permissions('service.manage')
  @Post('services')
  createService(@OrgId() orgId: number, @Body() dto: CreateServiceDto) {
    return this.catalog.createService(orgId, dto);
  }

  @Permissions('service.read')
  @Get('services')
  listServices(
    @OrgId() orgId: number,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.catalog.listServices(orgId, categoryId ? Number(categoryId) : undefined);
  }

  @Permissions('service.manage')
  @Patch('services/:id')
  updateService(@Param('id', ParseIntPipe) id: number, @OrgId() orgId: number, @Body() dto: UpdateServiceDto) {
    return this.catalog.updateService(id, orgId, dto);
  }
}
