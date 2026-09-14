import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OrgId, Permissions, Public } from '../common/decorators';
import { CmsService } from './cms.service';
import { FaqDto, UpsertPageDto } from './dto';

@ApiTags('cms')
@Controller()
export class CmsController {
  constructor(private readonly cms: CmsService) {}

  @Permissions('content.manage')
  @Post('cms/pages')
  @ApiBearerAuth()
  upsertPage(@OrgId() orgId: number, @Body() dto: UpsertPageDto) {
    return this.cms.upsertPage(orgId, dto);
  }

  @Permissions('content.read')
  @Get('cms/pages')
  @ApiBearerAuth()
  listPages(@OrgId() orgId: number) {
    return this.cms.listPages(orgId);
  }

  @Public()
  @Get('pages/:slug')
  getBySlug(@Query('organizationId', ParseIntPipe) organizationId: number, @Param('slug') slug: string) {
    return this.cms.getBySlug(organizationId, slug);
  }

  @Permissions('content.read')
  @Get('cms/articles')
  @ApiBearerAuth()
  listArticles(
    @OrgId() orgId: number,
    @Query('type') type?: string,
  ) {
    return this.cms.listArticles(orgId, type);
  }

  @Permissions('content.manage')
  @Post('cms/faqs')
  @ApiBearerAuth()
  upsertFaq(@OrgId() orgId: number, @Body() dto: FaqDto) {
    return this.cms.upsertFaq(orgId, dto);
  }

  @Public()
  @Get('faqs')
  listFaqs(@Query('organizationId', ParseIntPipe) organizationId: number) {
    return this.cms.listFaqs(organizationId);
  }
}
