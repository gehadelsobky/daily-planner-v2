CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "Priority" AS ENUM ('high', 'medium', 'low');
CREATE TYPE "HabitFrequency" AS ENUM ('daily', 'weekdays', 'custom');
CREATE TYPE "ExerciseIntensity" AS ENUM ('low', 'medium', 'high');
CREATE TYPE "WaterUnit" AS ENUM ('cups', 'ml');

CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "email" TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "timezone" TEXT NOT NULL DEFAULT 'UTC',
  "weekStartDay" INTEGER NOT NULL DEFAULT 1,
  "waterDefaultTarget" INTEGER,
  "waterDefaultUnit" "WaterUnit" NOT NULL DEFAULT 'cups',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "ScoreSetting" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "tasksWeight" INTEGER NOT NULL,
  "growWeight" INTEGER NOT NULL,
  "habitsWeight" INTEGER NOT NULL,
  "exerciseWeight" INTEGER NOT NULL,
  "gratefulWeight" INTEGER NOT NULL,
  "waterWeight" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "DailyEntry" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "growText" TEXT,
  "notesText" TEXT,
  "tomorrowItems" JSONB NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "Task" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "dailyEntryId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "isCompleted" BOOLEAN NOT NULL DEFAULT false,
  "priority" "Priority" NOT NULL DEFAULT 'medium',
  "category" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3)
);

CREATE TABLE "Habit" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "frequency" "HabitFrequency" NOT NULL DEFAULT 'daily',
  "customDays" JSONB,
  "isActive" BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE "HabitLog" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "habitId" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "isDone" BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE "ExerciseLog" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "dailyEntryId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "minutes" INTEGER NOT NULL,
  "intensity" "ExerciseIntensity",
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "GratitudeItem" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "dailyEntryId" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "WaterLog" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "dailyEntryId" TEXT NOT NULL UNIQUE,
  "target" INTEGER,
  "consumed" INTEGER NOT NULL DEFAULT 0,
  "unit" "WaterUnit" NOT NULL DEFAULT 'cups'
);

CREATE TABLE "XPEvent" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "xp" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Badge" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "code" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL
);

CREATE TABLE "UserBadge" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "badgeId" TEXT NOT NULL,
  "earnedOn" TIMESTAMP(3) NOT NULL,
  UNIQUE ("userId", "badgeId")
);

CREATE TABLE "Challenge" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "code" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "rules" JSONB NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "UserChallenge" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "challengeId" TEXT NOT NULL,
  "joinedOn" TIMESTAMP(3) NOT NULL,
  "progress" JSONB NOT NULL,
  UNIQUE ("userId", "challengeId")
);

ALTER TABLE "ScoreSetting" ADD CONSTRAINT "ScoreSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
ALTER TABLE "DailyEntry" ADD CONSTRAINT "DailyEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_dailyEntryId_fkey" FOREIGN KEY ("dailyEntryId") REFERENCES "DailyEntry"("id") ON DELETE CASCADE;
ALTER TABLE "Habit" ADD CONSTRAINT "Habit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
ALTER TABLE "HabitLog" ADD CONSTRAINT "HabitLog_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit"("id") ON DELETE CASCADE;
ALTER TABLE "ExerciseLog" ADD CONSTRAINT "ExerciseLog_dailyEntryId_fkey" FOREIGN KEY ("dailyEntryId") REFERENCES "DailyEntry"("id") ON DELETE CASCADE;
ALTER TABLE "GratitudeItem" ADD CONSTRAINT "GratitudeItem_dailyEntryId_fkey" FOREIGN KEY ("dailyEntryId") REFERENCES "DailyEntry"("id") ON DELETE CASCADE;
ALTER TABLE "WaterLog" ADD CONSTRAINT "WaterLog_dailyEntryId_fkey" FOREIGN KEY ("dailyEntryId") REFERENCES "DailyEntry"("id") ON DELETE CASCADE;
ALTER TABLE "XPEvent" ADD CONSTRAINT "XPEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge"("id") ON DELETE CASCADE;
ALTER TABLE "UserChallenge" ADD CONSTRAINT "UserChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
ALTER TABLE "UserChallenge" ADD CONSTRAINT "UserChallenge_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE;

CREATE UNIQUE INDEX "ScoreSetting_userId_effectiveFrom_key" ON "ScoreSetting"("userId", "effectiveFrom");
CREATE UNIQUE INDEX "DailyEntry_userId_date_key" ON "DailyEntry"("userId", "date");
CREATE UNIQUE INDEX "HabitLog_habitId_date_key" ON "HabitLog"("habitId", "date");

CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");
CREATE INDEX "ScoreSetting_userId_effectiveFrom_idx" ON "ScoreSetting"("userId", "effectiveFrom");
CREATE INDEX "DailyEntry_userId_date_idx" ON "DailyEntry"("userId", "date");
CREATE INDEX "Task_dailyEntryId_sortOrder_idx" ON "Task"("dailyEntryId", "sortOrder");
CREATE INDEX "Task_dailyEntryId_isCompleted_idx" ON "Task"("dailyEntryId", "isCompleted");
CREATE INDEX "Habit_userId_isActive_idx" ON "Habit"("userId", "isActive");
CREATE INDEX "HabitLog_date_idx" ON "HabitLog"("date");
CREATE INDEX "ExerciseLog_dailyEntryId_createdAt_idx" ON "ExerciseLog"("dailyEntryId", "createdAt");
CREATE INDEX "GratitudeItem_dailyEntryId_createdAt_idx" ON "GratitudeItem"("dailyEntryId", "createdAt");
CREATE INDEX "XPEvent_userId_date_idx" ON "XPEvent"("userId", "date");
CREATE UNIQUE INDEX "XPEvent_userId_date_reason_key" ON "XPEvent"("userId", "date", "reason");
