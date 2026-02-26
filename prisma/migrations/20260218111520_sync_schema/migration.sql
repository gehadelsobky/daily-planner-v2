-- DropForeignKey
ALTER TABLE "public"."DailyEntry" DROP CONSTRAINT "DailyEntry_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ExerciseLog" DROP CONSTRAINT "ExerciseLog_dailyEntryId_fkey";

-- DropForeignKey
ALTER TABLE "public"."GratitudeItem" DROP CONSTRAINT "GratitudeItem_dailyEntryId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Habit" DROP CONSTRAINT "Habit_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."HabitLog" DROP CONSTRAINT "HabitLog_habitId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ScoreSetting" DROP CONSTRAINT "ScoreSetting_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Task" DROP CONSTRAINT "Task_dailyEntryId_fkey";

-- DropForeignKey
ALTER TABLE "public"."UserBadge" DROP CONSTRAINT "UserBadge_badgeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."UserBadge" DROP CONSTRAINT "UserBadge_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."UserChallenge" DROP CONSTRAINT "UserChallenge_challengeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."UserChallenge" DROP CONSTRAINT "UserChallenge_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."WaterLog" DROP CONSTRAINT "WaterLog_dailyEntryId_fkey";

-- DropForeignKey
ALTER TABLE "public"."XPEvent" DROP CONSTRAINT "XPEvent_userId_fkey";

-- AlterTable
ALTER TABLE "public"."Badge" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."Challenge" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."DailyEntry" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."ExerciseLog" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."GratitudeItem" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."Habit" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."HabitLog" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."ScoreSetting" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."Task" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."User" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."UserBadge" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."UserChallenge" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."WaterLog" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."XPEvent" ALTER COLUMN "id" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "public"."ScoreSetting" ADD CONSTRAINT "ScoreSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DailyEntry" ADD CONSTRAINT "DailyEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Task" ADD CONSTRAINT "Task_dailyEntryId_fkey" FOREIGN KEY ("dailyEntryId") REFERENCES "public"."DailyEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Habit" ADD CONSTRAINT "Habit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HabitLog" ADD CONSTRAINT "HabitLog_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "public"."Habit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExerciseLog" ADD CONSTRAINT "ExerciseLog_dailyEntryId_fkey" FOREIGN KEY ("dailyEntryId") REFERENCES "public"."DailyEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GratitudeItem" ADD CONSTRAINT "GratitudeItem_dailyEntryId_fkey" FOREIGN KEY ("dailyEntryId") REFERENCES "public"."DailyEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WaterLog" ADD CONSTRAINT "WaterLog_dailyEntryId_fkey" FOREIGN KEY ("dailyEntryId") REFERENCES "public"."DailyEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."XPEvent" ADD CONSTRAINT "XPEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserBadge" ADD CONSTRAINT "UserBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserBadge" ADD CONSTRAINT "UserBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "public"."Badge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserChallenge" ADD CONSTRAINT "UserChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserChallenge" ADD CONSTRAINT "UserChallenge_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "public"."Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
