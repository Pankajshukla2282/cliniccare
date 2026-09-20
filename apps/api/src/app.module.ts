import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { TenantController } from './tenant.controller';

@Module({
  controllers: [TenantController],
  providers: [PrismaService]
})
export class AppModule {}
