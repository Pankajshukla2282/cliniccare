import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppointmentsModule } from './appointments/appointments.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard, PermissionsGuard } from './common/guards';
import { PublicController } from './common/public.controller';
import { BillingModule } from './billing/billing.module';
import { CatalogModule } from './catalog/catalog.module';
import { ClinicalModule } from './clinical/clinical.module';
import { ClinicsModule } from './clinics/clinics.module';
import { CmsModule } from './cms/cms.module';
import { DoctorsModule } from './doctors/doctors.module';
import { DocumentsModule } from './documents/documents.module';
import { EngagementModule } from './engagement/engagement.module';
import { HealthController } from './health/health.controller';
import { NotificationsModule } from './notifications/notifications.module';
import { OrdersModule } from './orders/orders.module';
import { PatientsModule } from './patients/patients.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { ReportsModule } from './reports/reports.module';
import { SearchModule } from './search/search.module';
import { SkinModule } from './skin/skin.module';
import { TenantsModule } from './tenants/tenants.module';
import { TreatmentsModule } from './treatments/treatments.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: Number(process.env.THROTTLE_TTL_MS ?? 60_000),
        limit: Number(process.env.THROTTLE_LIMIT ?? 100),
      },
    ]),
    PrismaModule,
    AuditModule,
    AuthModule,
    UsersModule,
    ClinicsModule,
    DoctorsModule,
    CatalogModule,
    PatientsModule,
    AppointmentsModule,
    ClinicalModule,
    DocumentsModule,
    TreatmentsModule,
    SkinModule,
    ProductsModule,
    OrdersModule,
    BillingModule,
    NotificationsModule,
    CmsModule,
    EngagementModule,
    SearchModule,
    ReportsModule,
    TenantsModule,
  ],
  controllers: [HealthController, PublicController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
