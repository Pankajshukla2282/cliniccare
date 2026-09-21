-- Multi-tenant memberships and scoped role assignments.
DROP INDEX IF EXISTS "user_roles_userId_role_key";

CREATE TABLE "organization_memberships" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  "organizationId" INTEGER NOT NULL,
  "defaultClinicId" INTEGER,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "organization_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "organization_memberships_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "organization_memberships_defaultClinicId_fkey" FOREIGN KEY ("defaultClinicId") REFERENCES "clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "organization_memberships_userId_organizationId_key" UNIQUE ("userId", "organizationId")
);
CREATE INDEX "organization_memberships_organizationId_status_idx" ON "organization_memberships"("organizationId", "status");

-- Backfill every existing user's home organization as a membership.
INSERT INTO "organization_memberships" ("userId", "organizationId", "defaultClinicId", "status")
SELECT "id", "organizationId", "clinicId", "status"::text FROM "users";

ALTER TABLE "organization_memberships" ALTER COLUMN "status" TYPE "UserStatus" USING "status"::"UserStatus";

ALTER TABLE "user_roles" ADD COLUMN "organizationId" INTEGER;
ALTER TABLE "user_roles" ADD COLUMN "clinicId" INTEGER;
ALTER TABLE "user_roles" ADD COLUMN "scopeKey" TEXT;

UPDATE "user_roles" ur
SET "organizationId" = u."organizationId",
    "scopeKey" = CONCAT(u."id", ':', ur."role", ':ORG:', u."organizationId")
FROM "users" u WHERE u."id" = ur."userId";

ALTER TABLE "user_roles" ALTER COLUMN "scopeKey" SET NOT NULL;
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_scopeKey_key" UNIQUE ("scopeKey");
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "user_roles_userId_organizationId_idx" ON "user_roles"("userId", "organizationId");
CREATE INDEX "user_roles_organizationId_clinicId_role_idx" ON "user_roles"("organizationId", "clinicId", "role");
