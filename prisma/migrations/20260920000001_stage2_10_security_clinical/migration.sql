-- Stage 2-10: security, clinical workflow and reliability foundation
ALTER TABLE "medical_records" ADD COLUMN "contentHash" TEXT;
CREATE INDEX "medical_records_contentHash_idx" ON "medical_records"("contentHash");
CREATE TYPE "QueueTicketStatus" AS ENUM ('WAITING','CALLED','IN_PROGRESS','COMPLETED','SKIPPED');
CREATE TYPE "LabReportStatus" AS ENUM ('ORDERED','IN_PROGRESS','FINAL','AMENDED','CANCELLED');

CREATE TABLE "medicines" (
  "id" SERIAL PRIMARY KEY,
  "organizationId" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "genericName" TEXT,
  "strength" TEXT,
  "form" TEXT,
  "manufacturer" TEXT,
  "sku" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "medicines_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "medicines_organizationId_name_strength_key" ON "medicines"("organizationId","name","strength");
CREATE INDEX "medicines_organizationId_active_idx" ON "medicines"("organizationId","active");

CREATE TABLE "lab_reports" (
  "id" SERIAL PRIMARY KEY,
  "organizationId" INTEGER NOT NULL,
  "patientId" INTEGER NOT NULL,
  "consultationId" INTEGER,
  "doctorId" INTEGER,
  "testName" TEXT NOT NULL,
  "labName" TEXT,
  "result" TEXT,
  "units" TEXT,
  "referenceRange" TEXT,
  "interpretation" TEXT,
  "status" "LabReportStatus" NOT NULL DEFAULT 'ORDERED',
  "performedAt" TIMESTAMP(3),
  "documentPath" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "lab_reports_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "lab_reports_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "lab_reports_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "consultations"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "lab_reports_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "lab_reports_organizationId_patientId_performedAt_idx" ON "lab_reports"("organizationId","patientId","performedAt");
CREATE INDEX "lab_reports_consultationId_idx" ON "lab_reports"("consultationId");

CREATE TABLE "queue_tickets" (
  "id" SERIAL PRIMARY KEY,
  "organizationId" INTEGER NOT NULL,
  "clinicId" INTEGER NOT NULL,
  "patientId" INTEGER NOT NULL,
  "appointmentId" INTEGER,
  "tokenNumber" INTEGER NOT NULL,
  "queueType" TEXT NOT NULL DEFAULT 'CONSULTATION',
  "serviceDate" DATE NOT NULL,
  "status" "QueueTicketStatus" NOT NULL DEFAULT 'WAITING',
  "calledAt" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "queue_tickets_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "queue_tickets_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "queue_tickets_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "queue_tickets_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "queue_tickets_clinicId_serviceDate_tokenNumber_key" ON "queue_tickets"("clinicId","serviceDate","tokenNumber");
CREATE INDEX "queue_tickets_organizationId_clinicId_serviceDate_status_idx" ON "queue_tickets"("organizationId","clinicId","serviceDate","status");
CREATE INDEX "queue_tickets_patientId_serviceDate_idx" ON "queue_tickets"("patientId","serviceDate");

CREATE TABLE "idempotency_keys" (
  "id" SERIAL PRIMARY KEY,
  "organizationId" INTEGER,
  "userId" INTEGER,
  "key" TEXT NOT NULL,
  "method" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "statusCode" INTEGER,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "idempotency_keys_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "idempotency_keys_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "idempotency_keys_organizationId_key_key" ON "idempotency_keys"("organizationId","key");
CREATE INDEX "idempotency_keys_expiresAt_idx" ON "idempotency_keys"("expiresAt");

ALTER TABLE "prescription_items" ADD COLUMN "medicineId" INTEGER;
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "medicines"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "prescription_items_medicineId_idx" ON "prescription_items"("medicineId");
