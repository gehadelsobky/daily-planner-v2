-- AlterTable
ALTER TABLE "ScoreSetting" ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "DailyEntry" ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "Habit" ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "XPEvent" ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "workspaceId" TEXT;

-- CreateIndex
CREATE INDEX "ScoreSetting_workspaceId_effectiveFrom_idx" ON "ScoreSetting"("workspaceId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "DailyEntry_workspaceId_date_idx" ON "DailyEntry"("workspaceId", "date");

-- CreateIndex
CREATE INDEX "Habit_workspaceId_isActive_idx" ON "Habit"("workspaceId", "isActive");

-- CreateIndex
CREATE INDEX "XPEvent_workspaceId_date_idx" ON "XPEvent"("workspaceId", "date");

-- CreateIndex
CREATE INDEX "Notification_workspaceId_status_createdAt_idx" ON "Notification"("workspaceId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_workspaceId_createdAt_idx" ON "Notification"("workspaceId", "createdAt");

-- AddForeignKey
ALTER TABLE "ScoreSetting" ADD CONSTRAINT "ScoreSetting_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyEntry" ADD CONSTRAINT "DailyEntry_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Habit" ADD CONSTRAINT "Habit_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XPEvent" ADD CONSTRAINT "XPEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;
