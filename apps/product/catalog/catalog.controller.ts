import { Body, Controller, Get, Post, Param } from '@nestjs/common';
import { ApiTags, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { CatalogService } from './catalog.service';
import { CreateCategoryDto, CreateProductDto } from './dto';

@ApiTags('product')
@Controller('product/catalog')
export class CatalogController {
  constructor(@Inject(CatalogService) private readonly catalogService: CatalogService) {}

  @Post('category')
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.catalogService.createCategory(dto.organizationId, dto);
  }

  @Get('categories')
  listCategories(@Query('organizationId') organizationId: number) {
    return this.catalogService.listCategories(organizationId);
  }

  @Get('category/:id')
  getCategory(@Param('id') id: number) {
    return this.catalogService.getCategory(id);
  }

  @Post('product')
  createProduct(@Body() dto: CreateProductDto) {
    return this.catalogService.createProduct(dto.organizationId, dto);
  }

  @Get('products')
  listProducts(@Query('organizationId') organizationId: number, @Query('categoryId') categoryId?: number) {
    return this.catalogService.listProducts(organizationId, categoryId);
  }

  @Get('product/:id')
  getProduct(@Param('id') id: number) {
    return this.catalogService.getProduct(id);
  }
}