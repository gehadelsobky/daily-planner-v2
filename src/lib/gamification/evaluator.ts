import { differenceInCalendarDays, startOfDay } from "date-fns";
import { prisma } from "@/lib/db";
import { calculateDailyScore, normalizeWaterTarget } from "@/lib/score/service";
import { SYSTEM_DEFAULT_WATER_TARGET } from "@/lib/score/constants";
import { formatDateInTimezone, toDateOnlyUtc } from "@/lib/date";

type DayRecord = {
  date: string;
  dateUtc: Date;
  plannedTasks: number;
  completedTasks: number;
  growUsed: boolean;
  gratitudeCount: number;
  waterMet: boolean;
};

function startOfUtcDay(dateString: string): Date {
  return startOfDay(new Date(`${dateString}T00:00:00Z`));
}

function findConsecutiveStreakCompletionDate<T>(
  items: T[],
  target: number,
  qualifies: (item: T) => boolean,
  getDate: (item: T) => string
): string | null {
  let current = 0;
  let previousQualifiedDate: string | null = null;

  for (const item of items) {
    const currentDate = getDate(item);
    if (!qualifies(item)) {
      current = 0;
      previousQualifiedDate = null;
      continue;
    }

    if (
      previousQualifiedDate &&
      differenceInCalendarDays(startOfUtcDay(currentDate), startOfUtcDay(previousQualifiedDate)) === 1
    ) {
      current += 1;
    } else {
      current = 1;
    }

    previousQualifiedDate = currentDate;
    if (current >= target) {
      return currentDate;
    }
  }

  return null;
}

function currentConsecutiveStreak<T>(
  items: T[],
  qualifies: (item: T) => boolean,
  getDate: (item: T) => string
): number {
  if (items.length === 0) return 0;

  let streak = 0;
  let expectedDate: string | null = null;

  for (let i = items.length - 1; i >= 0; i -= 1) {
    const item = items[i];
    const currentDate = getDate(item);

    if (!qualifies(item)) {
      if (streak === 0) return 0;
      break;
    }

    if (expectedDate) {
      const gap = differenceInCalendarDays(startOfUtcDay(expectedDate), startOfUtcDay(currentDate));
      if (gap !== 1) {
        break;
      }
    }

    streak += 1;
    expectedDate = currentDate;
  }

  return streak;
}

function findRollingWindowCompletionDate(
  days: string[],
  windowDays: number,
  targetCount: number
): string | null {
  if (days.length < targetCount) return null;

  let left = 0;
  for (let right = 0; right < days.length; right += 1) {
    const rightDate = startOfUtcDay(days[right]);
    while (
      left <= right &&
      differenceInCalendarDays(rightDate, startOfUtcDay(days[left])) >= windowDays
    ) {
      left += 1;
    }
    if (right - left + 1 >= targetCount) {
      return days[right];
    }
  }

  return null;
}

async function awardBadge(userId: string, code: string, earnedOn: Date): Promise<boolean> {
  const badge = await prisma.badge.findUnique({ where: { code } });
  if (!badge) return false;

  const existing = await prisma.userBadge.findUnique({
    where: {
      userId_badgeId: {
        userId,
        badgeId: badge.id
      }
    }
  });
  if (existing) return false;

  await prisma.userBadge.create({
    data: {
      userId,
      badgeId: badge.id,
      earnedOn
    }
  });

  return true;
}

export type GamificationEvaluationResult = {
  awardedBadges: string[];
  completedChallenges: string[];
};

export async function evaluateGamification(
  userId: string,
  asOfDate: string,
  timezone: string
): Promise<GamificationEvaluationResult> {
  const awardedBadges = new Set<string>();
  const completedChallenges = new Set<string>();
  const asOfUtc = toDateOnlyUtc(asOfDate, timezone);
  const [user, entries] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { waterDefaultTarget: true, waterDefaultUnit: true }
    }),
    prisma.dailyEntry.findMany({
      where: {
        userId,
        date: { lte: asOfUtc }
      },
      include: {
        tasks: true,
        gratitudeItems: true,
        waterLog: true
      },
      orderBy: { date: "asc" }
    })
  ]);

  if (!entries.length) {
    return { awardedBadges: [], completedChallenges: [] };
  }

  const defaultWaterUnit = user?.waterDefaultUnit ?? "cups";
  const defaultWaterTarget =
    user?.waterDefaultTarget ??
    normalizeWaterTarget(undefined, defaultWaterUnit) ??
    SYSTEM_DEFAULT_WATER_TARGET;

  const dayRecords: DayRecord[] = entries.map((entry) => {
    const target = normalizeWaterTarget(entry.waterLog?.target ?? defaultWaterTarget, entry.waterLog?.unit ?? defaultWaterUnit);
    const consumed = entry.waterLog?.consumed ?? 0;

    return {
      date: formatDateInTimezone(entry.date, timezone),
      dateUtc: entry.date,
      plannedTasks: entry.tasks.length,
      completedTasks: entry.tasks.filter((task) => task.isCompleted).length,
      growUsed: (entry.growText ?? "").trim().length > 0,
      gratitudeCount: entry.gratitudeItems.length,
      waterMet: target > 0 && consumed >= target
    };
  });

  const taskFinisherDays = dayRecords.filter(
    (day) => day.plannedTasks > 0 && day.completedTasks === day.plannedTasks
  );
  if (taskFinisherDays.length >= 3) {
    const created = await awardBadge(userId, "task_finisher", taskFinisherDays[2].dateUtc);
    if (created) awardedBadges.add("task_finisher");
  }

  const hydrationSuccessDays = dayRecords.filter((day) => day.waterMet).map((day) => day.date);
  const hydrationBadgeDate = findConsecutiveStreakCompletionDate(
    dayRecords,
    7,
    (day) => day.waterMet,
    (day) => day.date
  );
  if (hydrationBadgeDate) {
    const created = await awardBadge(userId, "hydration_hit", toDateOnlyUtc(hydrationBadgeDate, timezone));
    if (created) awardedBadges.add("hydration_hit");
  }

  const growDays = dayRecords.filter((day) => day.growUsed).map((day) => day.date);
  const growthBadgeDate = findRollingWindowCompletionDate(growDays, 7, 5);
  if (growthBadgeDate) {
    const created = await awardBadge(userId, "growth_note", toDateOnlyUtc(growthBadgeDate, timezone));
    if (created) awardedBadges.add("growth_note");
  }

  const scoreResults = await Promise.all(
    dayRecords.map(async (day) => ({
      date: day.date,
      dateUtc: day.dateUtc,
      score: await calculateDailyScore(userId, day.date, timezone)
    }))
  );

  const consistencyBadgeDate = findConsecutiveStreakCompletionDate(
    scoreResults,
    5,
    (item) => item.score.scorePercent >= 75,
    (item) => item.date
  );
  if (consistencyBadgeDate) {
    const created = await awardBadge(userId, "consistency_builder", toDateOnlyUtc(consistencyBadgeDate, timezone));
    if (created) awardedBadges.add("consistency_builder");
  }

  const balancedDay = scoreResults.find(
    (item) =>
      item.score.scorePercent >= 80 &&
      item.score.breakdown.every(
        (part) => part.na || (part.normalizedScore ?? 0) >= 1
      )
  );
  if (balancedDay) {
    const created = await awardBadge(userId, "balanced_day", balancedDay.dateUtc);
    if (created) awardedBadges.add("balanced_day");
  }

  const hydrationChallenge = await prisma.challenge.findFirst({
    where: {
      code: "hydration_7",
      startDate: { lte: asOfUtc },
      endDate: { gte: asOfUtc }
    }
  });

  if (hydrationChallenge) {
    const targetDays =
      typeof (hydrationChallenge.rules as { days?: unknown })?.days === "number"
        ? Number((hydrationChallenge.rules as { days?: unknown }).days)
        : 7;
    const currentStreak = currentConsecutiveStreak(
      dayRecords,
      (day) => day.waterMet,
      (day) => day.date
    );
    const progress = {
      completed: Math.min(targetDays, currentStreak),
      target: targetDays,
      percent: Math.min(100, Math.round((Math.min(targetDays, currentStreak) / targetDays) * 100)),
      currentStreak,
      completedAt: currentStreak >= targetDays ? asOfDate : null
    };

    const existing = await prisma.userChallenge.findUnique({
      where: {
        userId_challengeId: {
          userId,
          challengeId: hydrationChallenge.id
        }
      }
    });
    const previouslyCompleted = Boolean(
      existing?.progress &&
        typeof existing.progress === "object" &&
        (existing.progress as { completedAt?: unknown }).completedAt
    );

    await prisma.userChallenge.upsert({
      where: {
        userId_challengeId: {
          userId,
          challengeId: hydrationChallenge.id
        }
      },
      create: {
        userId,
        challengeId: hydrationChallenge.id,
        joinedOn: asOfUtc,
        progress
      },
      update: {
        progress
      }
    });

    if (!previouslyCompleted && progress.completedAt) {
      completedChallenges.add(hydrationChallenge.code);
    }
  }

  return {
    awardedBadges: Array.from(awardedBadges),
    completedChallenges: Array.from(completedChallenges)
  };
}
