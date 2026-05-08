import { AccountStatus, OnboardingState, Prisma, PrismaClient, User } from "@prisma/client";

type DbClient = PrismaClient | Prisma.TransactionClient;

export type LifecycleSnapshot = {
  accountStatus: AccountStatus;
  emailVerifiedAt: Date | null;
  lastLoginAt: Date | null;
  lastActiveAt: Date | null;
  onboardingState: OnboardingState;
  onboardingCompletedAt: Date | null;
  onboardingProgressPercent: number;
  nextRecommendedStep: string;
};

function hasProfileConfiguration(user: Pick<User, "timezone" | "weekStartDay" | "waterDefaultTarget">) {
  return user.timezone !== "UTC" || user.weekStartDay !== 1 || user.waterDefaultTarget !== null;
}

function progressFromState(state: OnboardingState) {
  switch (state) {
    case OnboardingState.not_started:
      return 10;
    case OnboardingState.profile_configured:
      return 40;
    case OnboardingState.habits_started:
      return 75;
    case OnboardingState.first_day_completed:
      return 100;
    default:
      return 0;
  }
}

function nextStepFromState(state: OnboardingState) {
  switch (state) {
    case OnboardingState.not_started:
      return "Complete your profile defaults so the planner matches your routine.";
    case OnboardingState.profile_configured:
      return "Create your first habit to turn the planner into a daily system.";
    case OnboardingState.habits_started:
      return "Close your first day to complete onboarding and unlock a stable routine.";
    case OnboardingState.first_day_completed:
      return "Onboarding complete. Keep your streak moving with one meaningful win each day.";
    default:
      return "Continue setting up your planner.";
  }
}

export function buildLifecycleSnapshot(
  user: Pick<
    User,
    "accountStatus" | "emailVerifiedAt" | "lastLoginAt" | "lastActiveAt" | "onboardingState" | "onboardingCompletedAt"
  >
): LifecycleSnapshot {
  return {
    accountStatus: user.accountStatus,
    emailVerifiedAt: user.emailVerifiedAt,
    lastLoginAt: user.lastLoginAt,
    lastActiveAt: user.lastActiveAt,
    onboardingState: user.onboardingState,
    onboardingCompletedAt: user.onboardingCompletedAt,
    onboardingProgressPercent: progressFromState(user.onboardingState),
    nextRecommendedStep: nextStepFromState(user.onboardingState)
  };
}

export async function syncUserLifecycle(db: DbClient, userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      accountStatus: true,
      emailVerifiedAt: true,
      lastLoginAt: true,
      lastActiveAt: true,
      onboardingState: true,
      onboardingCompletedAt: true,
      timezone: true,
      weekStartDay: true,
      waterDefaultTarget: true
    }
  });

  if (!user) {
    throw new Error(`User ${userId} not found while syncing lifecycle`);
  }

  const [habitCount, closedEntry] = await Promise.all([
    db.habit.count({
      where: {
        userId,
        isActive: true
      }
    }),
    db.dailyEntry.findFirst({
      where: {
        userId,
        closedAt: { not: null }
      },
      orderBy: {
        closedAt: "asc"
      },
      select: {
        closedAt: true
      }
    })
  ]);

  const nextState = closedEntry?.closedAt
    ? OnboardingState.first_day_completed
    : habitCount > 0
      ? OnboardingState.habits_started
      : hasProfileConfiguration(user)
        ? OnboardingState.profile_configured
        : OnboardingState.not_started;

  const nextCompletedAt = nextState === OnboardingState.first_day_completed ? (user.onboardingCompletedAt ?? closedEntry?.closedAt ?? new Date()) : null;

  const updated = await db.user.update({
    where: { id: userId },
    data: {
      onboardingState: nextState,
      onboardingCompletedAt: nextCompletedAt
    },
    select: {
      accountStatus: true,
      emailVerifiedAt: true,
      lastLoginAt: true,
      lastActiveAt: true,
      onboardingState: true,
      onboardingCompletedAt: true
    }
  });

  return buildLifecycleSnapshot(updated);
}

export async function touchUserActivity(
  db: DbClient,
  userId: string,
  options?: { login?: boolean }
) {
  const now = new Date();
  return db.user.update({
    where: { id: userId },
    data: {
      lastActiveAt: now,
      ...(options?.login ? { lastLoginAt: now } : {})
    },
    select: {
      id: true
    }
  });
}
