ALTER TABLE "WorkspaceInviteRequest" ADD COLUMN "pipelineStage" TEXT;

CREATE TABLE "WorkspaceConversionEvent" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "recommendedTrack" TEXT,
    "activeState" TEXT,
    "targetHref" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceConversionEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WorkspaceConversionEvent_workspaceId_createdAt_idx" ON "WorkspaceConversionEvent"("workspaceId", "createdAt");
CREATE INDEX "WorkspaceConversionEvent_source_createdAt_idx" ON "WorkspaceConversionEvent"("source", "createdAt");
CREATE INDEX "WorkspaceConversionEvent_recommendedTrack_createdAt_idx" ON "WorkspaceConversionEvent"("recommendedTrack", "createdAt");

ALTER TABLE "WorkspaceConversionEvent"
ADD CONSTRAINT "WorkspaceConversionEvent_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkspaceConversionEvent"
ADD CONSTRAINT "WorkspaceConversionEvent_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
