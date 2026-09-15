// ClinicCare seed: demo org, admin, RBAC permissions, specialties,
// service catalog, notification templates. Idempotent (upserts).
// Run: npx tsx prisma/seed.ts  (with DATABASE_URL set, e.g. from .env)
import 'dotenv/config';
import { PrismaClient, Role } from '../apps/api/src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' }) });

const PERMISSIONS: Record<Role, string[]> = {
  SUPER_ADMIN: ['*'],
  ADMIN: ['*'],
  CLINIC_ADMIN: ['*'],
  DOCTOR: [
    'patient.read', 'medical_record.read', 'medical_record.manage',
    'consultation.read', 'consultation.manage',
    'prescription.read', 'prescription.manage', 'treatment.read', 'treatment.manage',
    'appointment.read', 'document.read', 'document.manage', 'product.read',
    'doctor.read', 'service.read', 'content.read',
    'followup.read', 'followup.manage', 'review.read', 'search.use', 'report.view',
  ],
  RECEPTIONIST: [
    'patient.read', 'patient.manage', 'appointment.read', 'appointment.manage',
    'billing.read', 'doctor.read', 'service.read',
    'lead.read', 'lead.manage', 'followup.read', 'search.use',
  ],
  NURSE: [
    'patient.read', 'medical_record.read', 'treatment.read', 'treatment.manage',
    'appointment.read', 'followup.read', 'followup.manage',
  ],
  PHARMACIST: ['product.read', 'product.manage', 'order.read', 'order.manage', 'billing.read', 'search.use'],
  ACCOUNTANT: ['billing.read', 'billing.manage', 'order.read', 'report.view', 'search.use'],
  CONTENT_MANAGER: ['content.manage', 'content.read', 'review.read', 'review.manage'],
  PATIENT: [
    'patient.read', 'appointment.read', 'appointment.manage', 'consultation.read',
    'prescription.read', 'medical_record.read', 'treatment.read', 'document.read',
    'order.read', 'order.manage', 'product.read', 'content.read',
    'review.read', 'review.manage', 'followup.read',
  ],
};

async function main() {
  const org = await prisma.organization.upsert({
    where: { name: 'ClinicCare Demo' },
    create: {
      name: 'ClinicCare Demo',
      slug: 'cliniccare-demo',
      legalName: 'ClinicCare Demo Clinic',
      email: 'care@cliniccare.local',
      plan: 'STARTER',
      status: 'ACTIVE',
      onboardingCompleted: true,
      maxClinics: 3,
      maxDoctors: 5,
      maxPatients: 1000,
      settings: {
        brand: { primary: '174 100% 38%', primaryForeground: '0 0% 100%' },
        radius: 6,
      },
    },
    update: {
      slug: 'cliniccare-demo',
      plan: 'STARTER',
      status: 'ACTIVE',
      onboardingCompleted: true,
      maxClinics: 3,
      maxDoctors: 5,
      maxPatients: 1000,
      settings: {
        brand: { primary: '174 100% 38%', primaryForeground: '0 0% 100%' },
        radius: 6,
      },
    },
  });

  const platformOrg = await prisma.organization.upsert({
    where: { name: 'Platform' },
    create: {
      name: 'Platform',
      slug: 'platform',
      status: 'ACTIVE',
      onboardingCompleted: true,
    },
    update: { slug: 'platform', status: 'ACTIVE' },
  });

  for (const [role, permissions] of Object.entries(PERMISSIONS)) {
    for (const permission of permissions) {
      const existing = await prisma.rolePermission.findFirst({
        where: { organizationId: null, role: role as Role, permission },
      });
      if (!existing) {
        await prisma.rolePermission.create({
          data: { organizationId: null, role: role as Role, permission },
        });
      }
    }
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@cliniccare.local';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!';
  const adminHash = await bcrypt.hash(adminPassword, 10);
  await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      organizationId: org.id,
      email: adminEmail,
      passwordHash: adminHash,
      firstName: 'Clinic',
      lastName: 'Admin',
      primaryRole: 'ADMIN',
    },
    update: { passwordHash: adminHash },
  });

  const superAdminEmail = process.env.SEED_SUPER_ADMIN_EMAIL ?? 'superadmin@cliniccare.local';
  const superAdminPassword = process.env.SEED_SUPER_ADMIN_PASSWORD ?? 'SuperAdmin123!';
  const superAdminHash = await bcrypt.hash(superAdminPassword, 10);
  await prisma.user.upsert({
    where: { email: superAdminEmail },
    create: {
      organizationId: platformOrg.id,
      email: superAdminEmail,
      passwordHash: superAdminHash,
      firstName: 'Platform',
      lastName: 'Super Admin',
      primaryRole: 'SUPER_ADMIN',
    },
    update: { passwordHash: superAdminHash },
  });

  const demoClinics = [
    { id: 1, name: 'Main Clinic', city: 'Mumbai', state: 'Maharashtra' },
    { id: 2, name: 'Pune Skin & Aesthetic', city: 'Pune', state: 'Maharashtra' },
    { id: 3, name: 'Goa Wellness', city: 'Panaji', state: 'Goa' },
  ];
  const clinics = [];
  for (const c of demoClinics) {
    clinics.push(
      await prisma.clinic.upsert({
        where: { id: c.id },
        create: { organizationId: org.id, name: c.name, city: c.city, state: c.state },
        update: { organizationId: org.id, name: c.name, city: c.city, state: c.state },
      }),
    );
  }

  for (const s of [
    { name: 'EECP', description: 'Enhanced External Counterpulsation therapy', category: 'Therapy' },
    { name: 'Metallic Detoxification', description: 'Heavy-metal detoxification programs', category: 'Therapy' },
    { name: 'Dermatology', description: 'Skin care consultations', category: 'Consultation' },
    { name: 'Cosmetology', description: 'Aesthetic and cosmetic procedures', category: 'Cosmetic' },
  ]) {
    await prisma.specialty.upsert({ where: { name: s.name }, create: s, update: {} });
  }

  const therapy = await prisma.serviceCategory.upsert({
    where: { organizationId_name: { organizationId: org.id, name: 'Therapy' } },
    create: { organizationId: org.id, name: 'Therapy' },
    update: {},
  });
  const skin = await prisma.serviceCategory.upsert({
    where: { organizationId_name: { organizationId: org.id, name: 'Skin & Aesthetic' } },
    create: { organizationId: org.id, name: 'Skin & Aesthetic' },
    update: {},
  });

  for (const s of [
    { organizationId: org.id, categoryId: therapy.id, name: 'EECP Session', durationMinutes: 60, price: 2500 },
    { organizationId: org.id, categoryId: therapy.id, name: 'Detox Consultation', durationMinutes: 30, price: 1000 },
    { organizationId: org.id, categoryId: skin.id, name: 'Skin Consultation', durationMinutes: 30, price: 800, onlineAvailable: true },
    { organizationId: org.id, categoryId: skin.id, name: 'Acne Treatment', durationMinutes: 45, price: 1500 },
  ]) {
    await prisma.service.upsert({
      where: { organizationId_name: { organizationId: org.id, name: s.name } },
      create: s,
      update: {},
    });
  }

  for (const t of [
    { organizationId: org.id, name: 'APPOINTMENT_CONFIRMED', channel: 'SMS' as const, content: 'Hi {{name}}, your appointment with {{doctor}} on {{date}} at {{time}} is confirmed.' },
    { organizationId: org.id, name: 'APPOINTMENT_REMINDER', channel: 'WHATSAPP' as const, content: 'Reminder: appointment with {{doctor}} tomorrow at {{time}}.' },
    { organizationId: org.id, name: 'ORDER_CONFIRMED', channel: 'EMAIL' as const, subject: 'Order confirmed', content: 'Hi {{name}}, your order {{orderNumber}} for Rs. {{total}} is confirmed.' },
  ]) {
    await prisma.notificationTemplate.upsert({
      where: { organizationId_name_channel: { organizationId: t.organizationId, name: t.name, channel: t.channel } },
      create: t,
      update: {},
    });
  }

  await prisma.coupon.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'WELCOME10' } },
    create: {
      organizationId: org.id, code: 'WELCOME10', discountType: 'PERCENT', value: 10,
      minOrderValue: 500, active: true, usageLimit: 1000,
    },
    update: {},
  });

  await prisma.package.upsert({
    where: { organizationId_name: { organizationId: org.id, name: 'EECP 35 Sessions' } },
    create: {
      organizationId: org.id, name: 'EECP 35 Sessions', type: 'EECP_35_SESSIONS',
      price: 75000, totalSessions: 35, duration: '35 sessions over 7 weeks',
      description: 'Full EECP therapy course with assessment and follow-up',
    },
    update: {},
  });

  await prisma.cmsPage.upsert({
    where: { organizationId_slug: { organizationId: org.id, slug: 'faq' } },
    create: {
      organizationId: org.id, title: 'Frequently Asked Questions', slug: 'faq', type: 'FAQ',
      status: 'PUBLISHED',
      content: { sections: [{ q: 'Do I need a consultation before buying products?', a: 'Doctor-recommended products require a consultation first.' }] },
    },
    update: {},
  });

  await prisma.prescriptionTemplate.upsert({
    where: { organizationId_name: { organizationId: org.id, name: 'Basic Skin Care' } },
    create: {
      organizationId: org.id, name: 'Basic Skin Care',
      items: [
        { name: 'Gentle Cleanser', dosage: '—', frequency: 'Twice daily', duration: '30 days', quantity: 1 },
        { name: 'Moisturizer SPF 30', dosage: '—', frequency: 'Every morning', duration: '30 days', quantity: 1 },
      ],
    },
    update: {},
  });

  // eslint-disable-next-line no-console
  console.log(`Seeded org ${org.id}, clinics ${clinics.map((c) => c.name).join(', ')}, admin ${adminEmail}`);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
