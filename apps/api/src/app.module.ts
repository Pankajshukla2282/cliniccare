import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AuditModule } from './audit/audit.module';
import { PatientsModule } from './patients/patients.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { ClinicalModule } from './clinical/clinical.module';
import { BillingModule } from './billing/billing.module';
import { DoctorsModule } from './doctors/doctors.module';
import { ClinicsModule } from './clinics/clinics.module';
import { DocumentsModule } from './documents/documents.module';
import { EngagementModule } from './engagement/engagement.module';
import { NotificationsModule } from './notifications/notifications.module';
import { OrdersModule } from './orders/orders.module';
import { ProductsModule } from './products/products.module';
import { CatalogModule } from './catalog/catalog.module';
import { ReportsModule } from './reports/reports.module';
import { SearchModule } from './search/search.module';
import { SkinModule } from './skin/skin.module';
import { TenantsModule } from './tenants/tenants.module';
import { TreatmentsModule } from './treatments/treatments.module';
import { UsersModule } from './users/users.module';
import { CmsModule } from './cms/cms.module';
import { QueueModule } from './queue/queue.module';
import { LabsModule } from './labs/labs.module';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtAuthGuard, PermissionsGuard, TenantAccessGuard } from './common/guards';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ApiExceptionFilter } from './common/filters';
import { OutputSanitizationInterceptor } from './common/interceptors';
import { IdempotencyInterceptor } from './common/idempotency.interceptor';
import { RequestSecurityMiddleware } from './common/request-security.middleware';
import { HealthController } from './health/health.controller';
import { PublicController } from './common/public.controller';
import { apiConfig } from './config';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: apiConfig.rateLimitTtlMs, limit: apiConfig.rateLimitMax }]),
    PrismaModule, AuthModule, AuditModule, PatientsModule, AppointmentsModule, ClinicalModule, BillingModule,
    DoctorsModule, ClinicsModule, DocumentsModule, EngagementModule, NotificationsModule, OrdersModule, ProductsModule,
    CatalogModule, ReportsModule, SearchModule, SkinModule, TenantsModule, TreatmentsModule, UsersModule, CmsModule,
    QueueModule, LabsModule,
  ],
  controllers: [HealthController, PublicController],
  providers: [
    Reflector,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: TenantAccessGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: OutputSanitizationInterceptor },
    { provide: APP_INTERCEPTOR, useClass: IdempotencyInterceptor },
  ],
})
export class AppModule {}