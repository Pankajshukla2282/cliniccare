import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OrgId, Permissions, Public } from '../common/decorators';
import { CmsService } from './cms.service';
import { PrismaService } from '../prisma/prisma.service';
import { resolvePublicOrganizationId } from '../common/tenant';
import { FaqDto, UpsertPageDto } from './dto';

@ApiTags('cms')
@Controller()
export class CmsController {
  constructor(private readonly cms: CmsService, private readonly prisma: PrismaService) {}

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
  async getBySlug(@Query('tenant') tenant: string | undefined, @Query('organizationId') organizationId: string | undefined, @Param('slug') slug: string) {
    const orgId = await resolvePublicOrganizationId(this.prisma, tenant, organizationId ? Number(organizationId) : undefined);
    return this.cms.getBySlug(orgId, slug);
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
  async listFaqs(@Query('tenant') tenant?: string, @Query('organizationId') organizationId?: string) {
    const orgId = await resolvePublicOrganizationId(this.prisma, tenant, organizationId ? Number(organizationId) : undefined);
    return this.cms.listFaqs(orgId);
  }
}
