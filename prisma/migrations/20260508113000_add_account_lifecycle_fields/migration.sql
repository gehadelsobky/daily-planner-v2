-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('active', 'disabled', 'locked', 'pending_verification');

-- CreateEnum
CREATE TYPE "OnboardingState" AS ENUM ('not_started', 'profile_configured', 'habits_started', 'first_day_completed');

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN "lastLoginAt" TIMESTAMP(3),
ADD COLUMN "lastActiveAt" TIMESTAMP(3),
ADD COLUMN "accountStatus" "AccountStatus" NOT NULL DEFAULT 'active',
ADD COLUMN "onboardingState" "OnboardingState" NOT NULL DEFAULT 'not_started',
ADD COLUMN "onboardingCompletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "User_accountStatus_createdAt_idx" ON "User"("accountStatus", "createdAt");

-- CreateIndex
CREATE INDEX "User_onboardingState_createdAt_idx" ON "User"("onboardingState", "createdAt");
