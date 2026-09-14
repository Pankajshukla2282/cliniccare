import { Module } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { RbacController } from './rbac.controller';
import { RbacService } from './rbac.service';

@Module({
  controllers: [AuditController, RbacController],
  providers: [AuditService, RbacService],
  exports: [AuditService],
})
export class AuditModule {}
