CREATE TYPE "WorkspaceInviteRequestStatus" AS ENUM ('pending', 'reviewed', 'approved', 'closed');

CREATE TABLE "WorkspaceInviteRequest" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "status" "WorkspaceInviteRequestStatus" NOT NULL DEFAULT 'pending',
    "source" TEXT NOT NULL,
    "requestCount" INTEGER NOT NULL DEFAULT 1,
    "requestedSeatCount" INTEGER NOT NULL,
    "inviteEmails" JSONB NOT NULL DEFAULT '[]',
    "message" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastRequestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceInviteRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkspaceInviteRequest_workspaceId_key" ON "WorkspaceInviteRequest"("workspaceId");
CREATE INDEX "WorkspaceInviteRequest_status_updatedAt_idx" ON "WorkspaceInviteRequest"("status", "updatedAt");
CREATE INDEX "WorkspaceInviteRequest_requestedByUserId_createdAt_idx" ON "WorkspaceInviteRequest"("requestedByUserId", "createdAt");
CREATE INDEX "WorkspaceInviteRequest_workspaceId_createdAt_idx" ON "WorkspaceInviteRequest"("workspaceId", "createdAt");

ALTER TABLE "WorkspaceInviteRequest"
ADD CONSTRAINT "WorkspaceInviteRequest_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkspaceInviteRequest"
ADD CONSTRAINT "WorkspaceInviteRequest_requestedByUserId_fkey"
FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
