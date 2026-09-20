-- Production hardening: distinguish session refresh tokens from one-time
-- password-reset tokens so the two token classes cannot be confused.
CREATE TYPE "RefreshTokenType" AS ENUM ('SESSION', 'PASSWORD_RESET');

ALTER TABLE "refresh_tokens"
  ADD COLUMN "type" "RefreshTokenType" NOT NULL DEFAULT 'SESSION';

CREATE INDEX "refresh_tokens_userId_type_revokedAt_idx"
  ON "refresh_tokens" ("userId", "type", "revokedAt");
