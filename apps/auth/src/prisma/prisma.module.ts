import { Module } from '@nestjs/common';
import { PrismaModule } from '../api/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
})
export class AuthPrismaModule {}