import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthPrismaService } from '../prisma/prisma.service';

@Module({
  providers: [AuthService, AuthPrismaService],
  exports: [AuthService, AuthPrismaService],
  controllers: [AuthController],
})
export class AuthServiceModule {}