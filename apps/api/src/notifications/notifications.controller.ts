import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OrgId, Permissions } from '../common/decorators';
import { CreateTemplateDto, SendNotificationDto } from './dto';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller()
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Permissions('notification.manage')
  @Post('notification-templates')
  createTemplate(@OrgId() orgId: number, @Body() dto: CreateTemplateDto) {
    return this.notifications.createTemplate(orgId, dto);
  }

  @Permissions('notification.read')
  @Get('notification-templates')
  listTemplates(@OrgId() orgId: number) {
    return this.notifications.listTemplates(orgId);
  }

  @Permissions('notification.manage')
  @Post('notifications/send')
  send(@OrgId() orgId: number, @Body() dto: SendNotificationDto) {
    return this.notifications.send(orgId, dto);
  }

  @Permissions('notification.read')
  @Get('notifications')
  listForUser(@OrgId() orgId: number, @Query('recipientUserId', ParseIntPipe) recipientUserId: number) {
    return this.notifications.listForUser(orgId, recipientUserId);
  }

  @Permissions('notification.read')
  @Get('notification-templates/:id')
  getTemplate(@OrgId() orgId: number, @Param('id', ParseIntPipe) id: number) {
    return this.notifications.getTemplate(id, orgId);
  }

  @Permissions('notification.manage')
  @Post('notifications/:id/read')
  markRead(@OrgId() orgId: number, @Param('id', ParseIntPipe) id: number) {
    return this.notifications.markRead(id, orgId);
  }
}
