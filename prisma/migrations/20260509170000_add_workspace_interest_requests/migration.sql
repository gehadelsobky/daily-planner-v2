-- CreateEnum
CREATE TYPE "WorkspaceInterestType" AS ENUM ('pro', 'team');

-- CreateEnum
CREATE TYPE "WorkspaceInterestStatus" AS ENUM ('pending', 'reviewed', 'contacted', 'closed');

-- CreateTable
CREATE TABLE "WorkspaceInterest" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "type" "WorkspaceInterestType" NOT NULL,
    "status" "WorkspaceInterestStatus" NOT NULL DEFAULT 'pending',
    "source" TEXT NOT NULL,
    "requestCount" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastRequestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceInterest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceInterest_workspaceId_type_key" ON "WorkspaceInterest"("workspaceId", "type");

-- CreateIndex
CREATE INDEX "WorkspaceInterest_status_updatedAt_idx" ON "WorkspaceInterest"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "WorkspaceInterest_requestedByUserId_createdAt_idx" ON "WorkspaceInterest"("requestedByUserId", "createdAt");

-- CreateIndex
CREATE INDEX "WorkspaceInterest_workspaceId_createdAt_idx" ON "WorkspaceInterest"("workspaceId", "createdAt");

-- AddForeignKey
ALTER TABLE "WorkspaceInterest" ADD CONSTRAINT "WorkspaceInterest_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceInterest" ADD CONSTRAINT "WorkspaceInterest_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
