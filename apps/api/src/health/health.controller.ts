import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/decorators';
import { PrismaService } from '../prisma/prisma.service';

@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get('healthz')
  async check() {
    const dbOk = await this.prisma.$queryRawUnsafe('SELECT 1').then(() => true).catch(() => false);
    return {
      status: dbOk ? 'ok' : 'degraded',
      service: 'cliniccare-api',
      time: new Date().toISOString(),
      db: dbOk ? 'connected' : 'disconnected',
    };
  }
}
