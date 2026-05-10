CREATE TABLE "AdminAuditLog" (
  "id" TEXT NOT NULL,
  "adminUserId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "details" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdminAuditLog_adminUserId_createdAt_idx" ON "AdminAuditLog"("adminUserId", "createdAt");
CREATE INDEX "AdminAuditLog_targetType_targetId_createdAt_idx" ON "AdminAuditLog"("targetType", "targetId", "createdAt");
CREATE INDEX "AdminAuditLog_action_createdAt_idx" ON "AdminAuditLog"("action", "createdAt");

ALTER TABLE "AdminAuditLog"
ADD CONSTRAINT "AdminAuditLog_adminUserId_fkey"
FOREIGN KEY ("adminUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
