import { Body, Controller, Get, Param, Post, Put, Delete } from '@nestjs/common';
import { ApiTags, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { PagesService } from './pages.service';

@ApiTags('cms')
@Controller('cms/pages')
export class PagesController {
  constructor(@Inject(PagesService) private readonly pagesService: PagesService) {}

  @Post()
  createPage(@Body() dto: { organizationId: number; title: string; slug: string; type?: string; content?: any; metaTitle?: string; metaDescription?: string; status?: string }) {
    return this.pagesService.createPage(dto.organizationId, dto);
  }

  @Get(':slug')
  getPage(@Query('organizationId') organizationId: number, @Param('slug') slug: string) {
    return this.pagesService.getPage(organizationId, slug);
  }

  @Get()
  listPages(@Query('organizationId') organizationId: number, @Query('status') status?: string) {
    return this.pagesService.listPages(organizationId, status);
  }

  @Put(':slug')
  updatePage(@Query('organizationId') organizationId: number, @Param('slug') slug: string, @Body() dto: { title?: string; content?: any; metaTitle?: string; metaDescription?: string; status?: string }) {
    return this.pagesService.updatePage(organizationId, slug, dto);
  }

  @Delete(':slug')
  deletePage(@Query('organizationId') organizationId: number, @Param('slug') slug: string) {
    return this.pagesService.deletePage(organizationId, slug);
  }
}