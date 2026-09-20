import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { Public } from '../common/decorators';
import { PrismaService } from '../prisma/prisma.service';

@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get('healthz')
  liveness() {
    return {
      status: 'ok',
      service: 'cliniccare-api',
      time: new Date().toISOString(),
    };
  }

  @Public()
  @Get('readyz')
  async readiness() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        service: 'cliniccare-api',
        time: new Date().toISOString(),
        dependencies: { database: 'connected' },
      };
    } catch {
      throw new ServiceUnavailableException({
        status: 'degraded',
        service: 'cliniccare-api',
        dependencies: { database: 'disconnected' },
      });
    }
  }
}
