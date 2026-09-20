import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuditModule } from '../audit/audit.module';
import { JwtAuthGuard, PermissionsGuard } from '../common/guards';
import { apiConfig } from '../config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';



@Module({
  imports: [
    AuditModule,
    JwtModule.register({
      global: true,
      secret: apiConfig.jwtSecret,
      signOptions: { expiresIn: apiConfig.jwtExpiresIn as any, algorithm: 'HS256', issuer: 'cliniccare', audience: 'cliniccare-web' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, PermissionsGuard],
  exports: [AuthService, JwtAuthGuard, PermissionsGuard],
})
export class AuthModule {}
