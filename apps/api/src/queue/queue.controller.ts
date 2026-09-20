import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, OrgId, Permissions, RequestUser, RequireIdempotency } from '../common/decorators';
import { CreateQueueTicketDto } from './dto'; import { QueueService } from './queue.service';
@ApiTags('queue') @ApiBearerAuth() @Controller('queue')
export class QueueController { constructor(private readonly service:QueueService){}
 @Permissions('appointment.manage') @RequireIdempotency() @Post('tickets') issue(@OrgId() o:number,@Body() d:CreateQueueTicketDto,@CurrentUser()u:RequestUser){return this.service.issue(o,d,u.sub)}
 @Permissions('appointment.read') @Get('tickets') list(@OrgId()o:number,@Query('clinicId',ParseIntPipe)c:number,@Query('date')d?:string){return this.service.list(o,c,d)}
 @Permissions('appointment.manage') @Patch('tickets/:id/:status') status(@OrgId()o:number,@Param('id',ParseIntPipe)i:number,@Param('status')s:'WAITING'|'CALLED'|'IN_PROGRESS'|'COMPLETED'|'SKIPPED',@CurrentUser()u:RequestUser){return this.service.updateStatus(o,i,s,u.sub)}
}
