import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OrgId, Permissions } from '../common/decorators';
import { AuditService } from './audit.service';

@ApiTags('audit')
@ApiBearerAuth()
@Controller('audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Permissions('*')
  @Get('logs')
  query(
    @OrgId() orgId: number,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('action') action?: string,
    @Query('performedBy') performedBy?: string,
    @Query('purpose') purpose?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.audit.query(orgId, {
      entityType,
      entityId: entityId ? Number(entityId) : undefined,
      action,
      performedBy: performedBy ? Number(performedBy) : undefined,
      purpose,
      skip: Number(skip ?? 0),
      take: Number(take ?? 50),
    });
  }

  @Permissions('*')
  @Get('entity')
  entityHistory(
    @OrgId() orgId: number,
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
  ) {
    return this.audit.entityHistory(orgId, entityType, Number(entityId));
  }
}
