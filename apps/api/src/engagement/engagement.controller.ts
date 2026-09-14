import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, OrgId, Permissions, Public, RequestUser } from '../common/decorators';
import { EngagementService } from './engagement.service';
import {
  CompleteFollowUpDto,
  CreateFollowUpDto,
  CreateLeadDto,
  CreateReviewDto,
  ModerateReviewDto,
  UpdateLeadDto,
} from './dto';

@ApiTags('engagement')
@Controller()
export class EngagementController {
  constructor(private readonly engagement: EngagementService) {}

  @Permissions('followup.manage')
  @Post('follow-ups')
  @ApiBearerAuth()
  createFollowUp(@OrgId() orgId: number, @Body() dto: CreateFollowUpDto) {
    return this.engagement.createFollowUp(orgId, dto);
  }

  @Permissions('followup.read')
  @Get('follow-ups/upcoming')
  @ApiBearerAuth()
  upcoming(@OrgId() orgId: number, @Query('patientId') patientId?: string, @Query('doctorId') doctorId?: string, @Query('days') days?: string) {
    return this.engagement.upcomingFollowUps(
      orgId,
      patientId ? Number(patientId) : undefined,
      doctorId ? Number(doctorId) : undefined,
      days ? Number(days) : 14,
    );
  }

  @Permissions('followup.manage')
  @Patch('follow-ups/:id/complete')
  @ApiBearerAuth()
  complete(@Param('id', ParseIntPipe) id: number, @OrgId() orgId: number, @Body() dto: CompleteFollowUpDto) {
    return this.engagement.completeFollowUp(id, orgId, dto);
  }

  @Permissions('review.manage')
  @Post('reviews')
  @ApiBearerAuth()
  createReview(@OrgId() orgId: number, @Body() dto: CreateReviewDto) {
    return this.engagement.createReview(orgId, dto);
  }

  @Public()
  @Get('reviews/published')
  published(@Query('organizationId', ParseIntPipe) organizationId: number, @Query('doctorId') doctorId?: string) {
    return this.engagement.listReviews(organizationId, 'APPROVED', doctorId ? Number(doctorId) : undefined);
  }

  @Permissions('review.manage')
  @Get('reviews')
  @ApiBearerAuth()
  listReviews(@OrgId() orgId: number, @Query('status') status?: string) {
    return this.engagement.listReviews(orgId, status);
  }

  @Permissions('review.manage')
  @Patch('reviews/:id/moderate')
  @ApiBearerAuth()
  moderate(
    @Param('id', ParseIntPipe) id: number,
    @OrgId() orgId: number,
    @Body() dto: ModerateReviewDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.engagement.moderateReview(id, orgId, dto, user.sub);
  }

  @Permissions('lead.manage')
  @Post('leads')
  @ApiBearerAuth()
  createLead(@OrgId() orgId: number, @Body() dto: CreateLeadDto) {
    return this.engagement.createLead(orgId, dto);
  }

  @Permissions('lead.read')
  @Get('leads')
  @ApiBearerAuth()
  listLeads(@OrgId() orgId: number, @Query('status') status?: string) {
    return this.engagement.listLeads(orgId, status);
  }

  @Permissions('lead.manage')
  @Patch('leads/:id')
  @ApiBearerAuth()
  updateLead(@Param('id', ParseIntPipe) id: number, @OrgId() orgId: number, @Body() dto: UpdateLeadDto) {
    return this.engagement.updateLead(id, orgId, dto);
  }
}
