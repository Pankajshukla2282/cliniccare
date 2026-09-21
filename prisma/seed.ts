/**
 * ClinicCare demo seed.
 *
 * Design goals:
 * - idempotent: safe to run repeatedly
 * - tenant-aware: no hard-coded database ids
 * - environment-aware: use SEED_TENANT_SLUG to isolate environments when
 *   multiple environments share a database (normally each environment has a
 *   separate database, which is preferred)
 * - representative: creates tenants, clinics, RBAC, staff, patients,
 *   doctors, catalog, products, CMS and notification data.
 *
 * Run:
 *   npm run db:seed
 *
 * Production requires explicit credentials and SEED_ALLOW_DEMO=true.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import { PrismaClient, Role } from '../apps/api/src/generated/prisma/client';

const connectionString = process.env.DATABASE_URL?.trim();
if (!connectionString) throw new Error('DATABASE_URL is required for seeding');

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const rounds = Math.max(12, Number(process.env.BCRYPT_SALT_ROUNDS ?? 12));
const environment = (process.env.APP_ENV ?? process.env.NODE_ENV ?? 'development').toLowerCase();
const allowDemo = process.env.SEED_ALLOW_DEMO === 'true';

if (environment === 'production' && !allowDemo) {
  throw new Error('Demo seed is blocked in production. Set SEED_ALLOW_DEMO=true only for an intentional demo database.');
}

const tenantSlug = (process.env.SEED_TENANT_SLUG ?? (environment === 'development' ? 'cliniccare-demo' : `cliniccare-${environment}-demo`))
  .trim().toLowerCase();
const tenantName = process.env.SEED_TENANT_NAME ?? `ClinicCare ${environment === 'development' ? 'Demo' : `${environment[0].toUpperCase()}${environment.slice(1)} Demo`}`;
const secondTenantSlug = process.env.SEED_SECOND_TENANT_SLUG ?? `${tenantSlug}-wellness`;
const secondTenantName = process.env.SEED_SECOND_TENANT_NAME ?? 'Aarogyam Skin & Wellness';

const PERMISSIONS: Record<Role, string[]> = {
  SUPER_ADMIN: ['*'],
  ADMIN: ['*'],
  CLINIC_ADMIN: ['*'],
  DOCTOR: ['patient.read','medical_record.read','medical_record.manage','consultation.read','consultation.manage','prescription.read','prescription.manage','treatment.read','treatment.manage','appointment.read','appointment.manage','document.read','document.manage','product.read','doctor.read','service.read','content.read','followup.read','followup.manage','review.read','search.use','report.view'],
  RECEPTIONIST: ['patient.read','patient.manage','appointment.read','appointment.manage','billing.read','doctor.read','service.read','lead.read','lead.manage','followup.read','search.use'],
  NURSE: ['patient.read','medical_record.read','treatment.read','treatment.manage','appointment.read','followup.read','followup.manage'],
  PHARMACIST: ['product.read','product.manage','order.read','order.manage','billing.read','search.use'],
  ACCOUNTANT: ['billing.read','billing.manage','order.read','report.view','search.use'],
  CONTENT_MANAGER: ['content.manage','content.read','review.read','review.manage'],
  PATIENT: ['patient.read','appointment.read','appointment.manage','consultation.read','prescription.read','medical_record.read','treatment.read','document.read','order.read','order.manage','product.read','content.read','review.read','review.manage','followup.read'],
};

async function passwordHash(value: string) { return bcrypt.hash(value, rounds); }

async function upsertUser(input: {
  email: string; password: string; firstName: string; lastName: string; role: Role;
  organizationId: number; clinicId?: number | null;
}) {
  const user = await prisma.user.upsert({
    where: { email: input.email },
    create: {
      email: input.email,
      passwordHash: await passwordHash(input.password),
      firstName: input.firstName,
      lastName: input.lastName,
      primaryRole: input.role,
      organizationId: input.organizationId,
      clinicId: input.clinicId ?? null,
      status: 'ACTIVE',
    },
    update: {
      passwordHash: await passwordHash(input.password),
      firstName: input.firstName,
      lastName: input.lastName,
      primaryRole: input.role,
      organizationId: input.organizationId,
      clinicId: input.clinicId ?? null,
      status: 'ACTIVE',
    },
  });

  await prisma.organizationMembership.upsert({
    where: { userId_organizationId: { userId: user.id, organizationId: input.organizationId } },
    create: { userId: user.id, organizationId: input.organizationId, defaultClinicId: input.clinicId ?? null, status: 'ACTIVE' },
    update: { defaultClinicId: input.clinicId ?? null, status: 'ACTIVE' },
  });

  const scopeKey = `${user.id}:${input.role}:${input.clinicId ? `CLINIC:${input.clinicId}` : `ORG:${input.organizationId}`}`;
  await prisma.userRole.upsert({
    where: { scopeKey },
    create: { userId: user.id, organizationId: input.organizationId, clinicId: input.clinicId ?? null, role: input.role, scopeKey },
    update: {},
  });
  return user;
}

async function upsertClinic(organizationId: number, name: string, city: string, state: string) {
  const existing = await prisma.clinic.findFirst({ where: { organizationId, name } });
  if (existing) return prisma.clinic.update({ where: { id: existing.id }, data: { city, state, status: 'ACTIVE' } });
  return prisma.clinic.create({ data: { organizationId, name, city, state, status: 'ACTIVE' } });
}

async function seedTenant(organizationId: number, mainClinic: { id: number }, label: string, key: string, adminEmailOverride?: string) {
  const safeKey = key.replace(/[^a-z0-9]+/g, '-');
  const adminEmail = adminEmailOverride ?? `admin+${safeKey}@cliniccare.local`;
  const doctorEmail = `doctor+${safeKey}@cliniccare.local`;
  const receptionEmail = `reception+${safeKey}@cliniccare.local`;
  const patientEmail = `patient+${safeKey}@cliniccare.local`;

  const admin = await upsertUser({ email: adminEmail, password: process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!', firstName: label, lastName: 'Admin', role: Role.ADMIN, organizationId, clinicId: mainClinic.id });
  const doctorUser = await upsertUser({ email: doctorEmail, password: process.env.SEED_DOCTOR_PASSWORD ?? 'Doctor123!', firstName: 'Aarav', lastName: 'Sharma', role: Role.DOCTOR, organizationId, clinicId: mainClinic.id });
  await upsertUser({ email: receptionEmail, password: process.env.SEED_RECEPTION_PASSWORD ?? 'Reception123!', firstName: 'Riya', lastName: 'Patil', role: Role.RECEPTIONIST, organizationId, clinicId: mainClinic.id });
  const patientUser = await upsertUser({ email: patientEmail, password: process.env.SEED_PATIENT_PASSWORD ?? 'Patient123!', firstName: 'Demo', lastName: 'Patient', role: Role.PATIENT, organizationId, clinicId: mainClinic.id });

  const doctor = await prisma.doctor.upsert({
    where: { userId: doctorUser.id },
    create: { userId: doctorUser.id, clinicId: mainClinic.id, registrationNumber: `REG-${organizationId}-001`, qualification: 'MBBS, MD', biography: `${label} demo physician`, languages: ['English','Hindi'], consultationTypes: ['IN_PERSON','ONLINE'], onlineAvailable: true, consultationFee: 1000, experienceYears: 8, status: 'ACTIVE' },
    update: { clinicId: mainClinic.id, status: 'ACTIVE', onlineAvailable: true },
  });

  const patient = await prisma.patient.upsert({
    where: { userId: patientUser.id },
    create: { userId: patientUser.id, organizationId, patientNumber: `P-${organizationId}-001`, gender: 'OTHER', status: 'ACTIVE' },
    update: { organizationId, status: 'ACTIVE' },
  });

  const dermatology = await prisma.specialty.upsert({ where: { name: 'Dermatology' }, create: { name: 'Dermatology', description: 'Skin care consultations', category: 'Consultation' }, update: {} });
  await prisma.doctorSpecialty.upsert({ where: { doctorId_specialtyId: { doctorId: doctor.id, specialtyId: dermatology.id } }, create: { doctorId: doctor.id, specialtyId: dermatology.id }, update: {} });

  const therapy = await prisma.serviceCategory.upsert({ where: { organizationId_name: { organizationId, name: 'Therapy' } }, create: { organizationId, name: 'Therapy' }, update: {} });
  const skin = await prisma.serviceCategory.upsert({ where: { organizationId_name: { organizationId, name: 'Skin & Aesthetic' } }, create: { organizationId, name: 'Skin & Aesthetic' }, update: {} });
  const services = [
    { categoryId: therapy.id, name: 'EECP Session', durationMinutes: 60, price: 2500 },
    { categoryId: therapy.id, name: 'Detox Consultation', durationMinutes: 30, price: 1000 },
    { categoryId: skin.id, name: 'Skin Consultation', durationMinutes: 30, price: 800, onlineAvailable: true },
    { categoryId: skin.id, name: 'Acne Treatment', durationMinutes: 45, price: 1500 },
  ];
  for (const item of services) {
    const service = await prisma.service.upsert({ where: { organizationId_name: { organizationId, name: item.name } }, create: { organizationId, ...item, status: 'ACTIVE' }, update: { ...item, status: 'ACTIVE' } });
    await prisma.doctorService.upsert({ where: { doctorId_serviceId: { doctorId: doctor.id, serviceId: service.id } }, create: { doctorId: doctor.id, serviceId: service.id }, update: {} });
  }

  for (const dayOfWeek of [1,2,3,4,5,6]) {
    const existing = await prisma.doctorSchedule.findFirst({ where: { doctorId: doctor.id, clinicId: mainClinic.id, dayOfWeek } });
    if (existing) await prisma.doctorSchedule.update({ where: { id: existing.id }, data: { startTime: '09:00', endTime: '17:00', isWorkingDay: true } });
    else await prisma.doctorSchedule.create({ data: { doctorId: doctor.id, clinicId: mainClinic.id, dayOfWeek, startTime: '09:00', endTime: '17:00', isWorkingDay: true } });
  }

  const productCategory = await prisma.productCategory.upsert({ where: { organizationId_name: { organizationId, name: 'Skin Care' } }, create: { organizationId, name: 'Skin Care' }, update: {} });
  await prisma.product.upsert({
    where: { organizationId_slug: { organizationId, slug: 'gentle-cleanser' } },
    create: { organizationId, categoryId: productCategory.id, name: 'Gentle Cleanser', slug: 'gentle-cleanser', price: 650, sku: `CL-${organizationId}-001`, inventoryQuantity: 100, status: 'ACTIVE' },
    update: { categoryId: productCategory.id, price: 650, inventoryQuantity: 100, status: 'ACTIVE' },
  });

  await prisma.cmsPage.upsert({
    where: { organizationId_slug: { organizationId, slug: 'faq' } },
    create: { organizationId, title: 'Frequently Asked Questions', slug: 'faq', type: 'FAQ', status: 'PUBLISHED', content: { sections: [{ q: 'Do I need a consultation?', a: 'Some services and products may require a consultation.' }] } },
    update: { status: 'PUBLISHED' },
  });
  await prisma.notificationTemplate.upsert({
    where: { organizationId_name_channel: { organizationId, name: 'APPOINTMENT_CONFIRMED', channel: 'SMS' } },
    create: { organizationId, name: 'APPOINTMENT_CONFIRMED', channel: 'SMS', content: 'Hi {{name}}, your appointment with {{doctor}} on {{date}} at {{time}} is confirmed.' },
    update: { content: 'Hi {{name}}, your appointment with {{doctor}} on {{date}} at {{time}} is confirmed.', isActive: true },
  });
  await prisma.coupon.upsert({
    where: { organizationId_code: { organizationId, code: 'WELCOME10' } },
    create: { organizationId, code: 'WELCOME10', discountType: 'PERCENT', value: 10, minOrderValue: 500, active: true, usageLimit: 1000 },
    update: { active: true, value: 10 },
  });

  return { admin, doctorUser, doctor, patient };
}

async function main() {
  for (const [role, permissions] of Object.entries(PERMISSIONS)) {
    for (const permission of permissions) {
      const existing = await prisma.rolePermission.findFirst({ where: { organizationId: null, role: role as Role, permission } });
      if (!existing) {
        await prisma.rolePermission.create({ data: { organizationId: null, role: role as Role, permission } });
      }
    }
  }

  const platform = await prisma.organization.upsert({
    where: { slug: 'platform' },
    create: { name: 'ClinicCare Platform', slug: 'platform', status: 'ACTIVE', onboardingCompleted: true },
    update: { status: 'ACTIVE', onboardingCompleted: true },
  });
  const superAdminEmail = process.env.SEED_SUPER_ADMIN_EMAIL ?? 'superadmin@cliniccare.local';
  const superAdmin = await upsertUser({ email: superAdminEmail, password: process.env.SEED_SUPER_ADMIN_PASSWORD ?? 'SuperAdmin123!', firstName: 'Platform', lastName: 'Super Admin', role: Role.SUPER_ADMIN, organizationId: platform.id });
  await prisma.userRole.upsert({
    where: { scopeKey: `${superAdmin.id}:SUPER_ADMIN:PLATFORM` },
    create: { userId: superAdmin.id, organizationId: null, clinicId: null, role: Role.SUPER_ADMIN, scopeKey: `${superAdmin.id}:SUPER_ADMIN:PLATFORM` },
    update: {},
  });

  const tenant = await prisma.organization.upsert({
    where: { slug: tenantSlug },
    create: { name: tenantName, slug: tenantSlug, legalName: `${tenantName} Healthcare`, email: `care@${tenantSlug}.local`, plan: 'STARTER', status: 'ACTIVE', onboardingCompleted: true, maxClinics: 5, maxDoctors: 25, maxPatients: 10000, settings: { environment, seeded: true } },
    update: { name: tenantName, status: 'ACTIVE', onboardingCompleted: true, maxClinics: 5, maxDoctors: 25, maxPatients: 10000, settings: { environment, seeded: true } },
  });
  const mainClinic = await upsertClinic(tenant.id, 'Main Clinic', 'Mumbai', 'Maharashtra');
  await upsertClinic(tenant.id, 'Pune Skin & Aesthetic', 'Pune', 'Maharashtra');
  await upsertClinic(tenant.id, 'Goa Wellness', 'Panaji', 'Goa');
  const primaryDemo = await seedTenant(tenant.id, mainClinic, 'Clinic', tenantSlug, process.env.SEED_ADMIN_EMAIL ?? 'admin@cliniccare.local');

  const secondTenant = await prisma.organization.upsert({
    where: { slug: secondTenantSlug },
    create: { name: secondTenantName, slug: secondTenantSlug, plan: 'STARTER', status: 'TRIAL', maxClinics: 2, maxDoctors: 10, maxPatients: 500, settings: { environment, seeded: true } },
    update: { status: 'TRIAL' },
  });
  const secondClinic = await upsertClinic(secondTenant.id, 'Aarogyam Main Clinic', 'Nagpur', 'Maharashtra');
  await seedTenant(secondTenant.id, secondClinic, 'Aarogyam', secondTenantSlug);

  // Demonstrate true multi-tenancy: the primary tenant administrator is also
  // a member of the second tenant with a clinic-scoped administrative role.
  await prisma.organizationMembership.upsert({
    where: { userId_organizationId: { userId: primaryDemo.admin.id, organizationId: secondTenant.id } },
    create: { userId: primaryDemo.admin.id, organizationId: secondTenant.id, defaultClinicId: secondClinic.id, status: 'ACTIVE' },
    update: { defaultClinicId: secondClinic.id, status: 'ACTIVE' },
  });
  const sharedScopeKey = `${primaryDemo.admin.id}:CLINIC_ADMIN:CLINIC:${secondClinic.id}`;
  await prisma.userRole.upsert({
    where: { scopeKey: sharedScopeKey },
    create: { userId: primaryDemo.admin.id, organizationId: secondTenant.id, clinicId: secondClinic.id, role: Role.CLINIC_ADMIN, scopeKey: sharedScopeKey },
    update: {},
  });

  console.log(JSON.stringify({
    environment,
    tenant: { id: tenant.id, slug: tenant.slug, clinicId: mainClinic.id },
    secondTenant: { id: secondTenant.id, slug: secondTenant.slug, clinicId: secondClinic.id },
    platform: { id: platform.id, superAdmin: superAdminEmail },
    demoPasswords: { admin: 'SEED_ADMIN_PASSWORD or ChangeMe123!', doctor: 'SEED_DOCTOR_PASSWORD or Doctor123!', reception: 'SEED_RECEPTION_PASSWORD or Reception123!', patient: 'SEED_PATIENT_PASSWORD or Patient123!' },
  }, null, 2));
}

main().catch((error) => { console.error(error); process.exit(1); }).finally(() => prisma.$disconnect());
