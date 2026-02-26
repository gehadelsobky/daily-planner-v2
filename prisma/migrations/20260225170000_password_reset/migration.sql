ALTER TABLE "User"
  ADD COLUMN "resetTokenHash" TEXT,
  ADD COLUMN "resetTokenExpiresAt" TIMESTAMP(3);

CREATE INDEX "User_resetTokenExpiresAt_idx" ON "User"("resetTokenExpiresAt");
