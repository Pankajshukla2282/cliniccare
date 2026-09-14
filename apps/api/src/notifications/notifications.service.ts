import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTemplateDto, SendNotificationDto } from './dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async assertUserInOrg(userId: number, organizationId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });
    if (!user || user.organizationId !== organizationId) {
      throw new NotFoundException('Recipient not found');
    }
  }

  createTemplate(organizationId: number, dto: CreateTemplateDto) {
    return this.prisma.notificationTemplate.upsert({
      where: {
        organizationId_name_channel: {
          organizationId,
          name: dto.name,
          channel: dto.channel,
        },
      },
      create: { ...dto, organizationId },
      update: { subject: dto.subject, content: dto.content },
    });
  }

  listTemplates(organizationId: number) {
    return this.prisma.notificationTemplate.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
    });
  }

  async send(organizationId: number, dto: SendNotificationDto) {
    await this.assertUserInOrg(dto.recipientUserId, organizationId);
    if (dto.templateId) {
      const template = await this.prisma.notificationTemplate.findFirst({
        where: { id: dto.templateId, organizationId },
      });
      if (!template) throw new NotFoundException('Template not found');
    }
    // Provider integration point (SMS/WhatsApp/Email gateways plug in here).
    // MVP records the notification and marks it SENT.
    const record = await this.prisma.notification.create({
      data: { ...dto, status: 'SENT', sentAt: new Date() },
    });
    this.logger.log(`Notification ${record.id} via ${dto.channel} to user ${dto.recipientUserId}`);
    return record;
  }

  async listForUser(organizationId: number, recipientUserId: number) {
    await this.assertUserInOrg(recipientUserId, organizationId);
    return this.prisma.notification.findMany({
      where: { recipientUserId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getTemplate(id: number, organizationId: number) {
    const template = await this.prisma.notificationTemplate.findFirst({
      where: { id, organizationId },
    });
    if (!template) throw new NotFoundException('Template not found');
    return template;
  }

  async triggerEvent(organizationId: number, eventName: string, recipientUserId: number, data: Record<string, unknown>) {
    const templates = await this.prisma.notificationTemplate.findMany({
      where: { organizationId, name: eventName, isActive: true },
    });
    if (templates.length === 0) return null;
    const results = [];
    for (const template of templates) {
      let content = template.content;
      for (const [key, value] of Object.entries(data)) {
        content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
      }
      const record = await this.prisma.notification.create({
        data: {
          recipientUserId,
          templateId: template.id,
          channel: template.channel,
          subject: template.subject ?? null,
          content,
          status: 'SENT',
          sentAt: new Date(),
        },
      });
      results.push(record);
    }
    return results;
  }

  async markRead(notificationId: number, organizationId: number) {
    const result = await this.prisma.notification.updateMany({
      where: { id: notificationId, recipient: { organizationId } },
      data: { status: 'DELIVERED', deliveredAt: new Date() },
    });
    if (result.count === 0) throw new NotFoundException('Notification not found');
    return this.prisma.notification.findUnique({ where: { id: notificationId } });
  }
}
