import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OrgId, Permissions } from '../common/decorators';
import { CreateImageDto, CreateSkinAssessmentDto, RecommendProductDto } from './dto';
import { SkinService } from './skin.service';

@ApiTags('skin')
@ApiBearerAuth()
@Controller()
export class SkinController {
  constructor(private readonly skin: SkinService) {}

  @Permissions('treatment.manage')
  @Post('skin-assessments')
  createAssessment(@OrgId() orgId: number, @Body() dto: CreateSkinAssessmentDto) {
    return this.skin.createAssessment(orgId, dto);
  }

  @Permissions('treatment.read')
  @Get('skin-assessments')
  listAssessments(@OrgId() orgId: number, @Query('patientId') patientId: string) {
    return this.skin.listAssessments(orgId, Number(patientId));
  }

  @Permissions('treatment.manage')
  @Post('treatment-images')
  addImage(@OrgId() orgId: number, @Body() dto: CreateImageDto) {
    return this.skin.addImage(orgId, dto);
  }

  @Permissions('treatment.read')
  @Get('treatment-images')
  listImages(@OrgId() orgId: number, @Query('patientId') patientId: string, @Query('treatmentPlanId') treatmentPlanId?: string) {
    return this.skin.listImages(orgId, Number(patientId), treatmentPlanId ? Number(treatmentPlanId) : undefined);
  }

  @Permissions('treatment.manage')
  @Post('product-recommendations')
  recommendProduct(@OrgId() orgId: number, @Body() dto: RecommendProductDto) {
    return this.skin.recommendProduct(orgId, dto);
  }

  @Permissions('treatment.read')
  @Get('product-recommendations')
  listRecommendations(@OrgId() orgId: number, @Query('patientId') patientId: string) {
    return this.skin.listRecommendations(orgId, Number(patientId));
  }
}
