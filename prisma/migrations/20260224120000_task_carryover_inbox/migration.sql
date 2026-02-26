CREATE TYPE "CarryoverState" AS ENUM ('pending_review', 'added_to_today', 'rescheduled', 'dismissed');

ALTER TABLE "Task"
  ADD COLUMN "carryoverState" "CarryoverState" NOT NULL DEFAULT 'pending_review',
  ADD COLUMN "carryoverUpdatedAt" TIMESTAMP(3),
  ADD COLUMN "sourceTaskId" TEXT;

ALTER TABLE "Task"
  ADD CONSTRAINT "Task_sourceTaskId_fkey"
  FOREIGN KEY ("sourceTaskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Task_sourceTaskId_idx" ON "Task"("sourceTaskId");
CREATE INDEX "Task_carryoverState_isCompleted_idx" ON "Task"("carryoverState", "isCompleted");
