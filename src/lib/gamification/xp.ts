import { subDays } from "date-fns";
import { prisma } from "@/lib/db";
import { formatDateInTimezone, toDateOnlyUtc } from "@/lib/date";
import { calculateDailyScore } from "@/lib/score/service";
import { DailyScoreResult, ScoreComponentKey } from "@/lib/score/types";

export const DAILY_RECURRING_XP_CAP = 150;
export const BADGE_XP_REWARD = 20;
export const CHALLENGE_XP_REWARD = 30;
const SCORE_THRESHOLD = 75;
const REQUIRED_KEYS = new Set<ScoreComponentKey>(["tasks", "grow", "water"]);
const MIN_REQUIRED_SECTIONS_MET = 2;

type XpMilestones = {
  awardedBadges: string[];
  completedChallenges: string[];
};

function normalizedPart(score: DailyScoreResult, key: ScoreComponentKey): number | null {
  const part = score.breakdown.find((item) => item.key === key);
  return part ? part.normalizedScore : null;
}

function isNaPart(score: DailyScoreResult, key: ScoreComponentKey): boolean {
  return Boolean(score.breakdown.find((item) => item.key === key)?.na);
}

function isCompletedDay(score: DailyScoreResult): boolean {
  const requiredBreakdown = score.breakdown.filter((item) => REQUIRED_KEYS.has(item.key));
  const activeRequiredBreakdown = requiredBreakdown.filter((item) => !item.na);
  const requiredMet = activeRequiredBreakdown.filter((item) => (item.normalizedScore ?? 0) >= 1).length;
  const minRequiredMet = Math.min(MIN_REQUIRED_SECTIONS_MET, activeRequiredBreakdown.length);
  return score.scorePercent >= SCORE_THRESHOLD && requiredMet >= minRequiredMet;
}

function streakBonus(streak: number): number {
  if (streak >= 7) return 12;
  if (streak >= 5) return 7;
  if (streak >= 3) return 3;
  return 0;
}

function habitStreakBonus(streak: number): number {
  if (streak >= 7) return 8;
  if (streak >= 5) return 5;
  if (streak >= 3) return 2;
  return 0;
}

function hydrationStreakBonus(streak: number): number {
  if (streak >= 7) return 8;
  if (streak >= 5) return 5;
  if (streak >= 3) return 2;
  return 0;
}

function currentScoreStreak(recent: DailyScoreResult[]): number {
  let streak = 0;
  for (let i = recent.length - 1; i >= 0; i -= 1) {
    if (recent[i].scorePercent >= SCORE_THRESHOLD) {
      streak += 1;
    } else {
      break;
    }
  }
  return streak;
}

function currentHydrationStreak(recent: DailyScoreResult[]): number {
  let streak = 0;
  for (let i = recent.length - 1; i >= 0; i -= 1) {
    const water = normalizedPart(recent[i], "water") ?? 0;
    if (water >= 1) {
      streak += 1;
    } else {
      break;
    }
  }
  return streak;
}

function currentHabitStreak(recent: DailyScoreResult[]): number {
  let streak = 0;
  for (let i = recent.length - 1; i >= 0; i -= 1) {
    const habits = normalizedPart(recent[i], "habits");
    const habitsNa = isNaPart(recent[i], "habits");

    if (habitsNa) {
      continue;
    }

    if ((habits ?? 0) >= 1) {
      streak += 1;
      continue;
    }

    break;
  }
  return streak;
}

async function getRecentScores(
  userId: string,
  asOfDate: string,
  timezone: string,
  lookbackDays = 45
): Promise<DailyScoreResult[]> {
  const asOfUtc = toDateOnlyUtc(asOfDate, timezone);
  const dates = [] as string[];
  for (let i = lookbackDays - 1; i >= 0; i -= 1) {
    dates.push(formatDateInTimezone(subDays(asOfUtc, i), timezone));
  }

  const results = [] as DailyScoreResult[];
  for (const date of dates) {
    results.push(await calculateDailyScore(userId, date, timezone));
  }
  return results;
}

export async function upsertXpForDay(
  userId: string,
  dateString: string,
  timezone: string,
  score: DailyScoreResult,
  milestones: XpMilestones
) {
  const dateUtc = toDateOnlyUtc(dateString, timezone);
  const baseXp = Math.max(0, Math.floor(score.scorePercent));

  const tasksNormalized = normalizedPart(score, "tasks") ?? 0;
  const waterNormalized = normalizedPart(score, "water") ?? 0;
  const habitsNormalized = normalizedPart(score, "habits");
  const habitsNa = isNaPart(score, "habits");
  const exerciseNormalized = normalizedPart(score, "exercise") ?? 0;
  const growNormalized = normalizedPart(score, "grow") ?? 0;
  const gratefulNormalized = normalizedPart(score, "grateful") ?? 0;

  const completedDayBonus = isCompletedDay(score) ? 10 : 0;
  const taskFinisherBonus = tasksNormalized >= 1 ? 5 : 0;
  const hydrationBonus = waterNormalized >= 1 ? 5 : 0;
  const habitMasteryBonus = !habitsNa && (habitsNormalized ?? 0) >= 1 ? 5 : 0;
  const exerciseBonus = exerciseNormalized >= 1 ? 5 : 0;
  const reflectionBonus = growNormalized >= 1 && gratefulNormalized >= 1 ? 5 : 0;

  const recentScores = await getRecentScores(userId, dateString, timezone);
  const scoreStreak = currentScoreStreak(recentScores);
  const hydrationStreak = currentHydrationStreak(recentScores);
  const habitStreak = currentHabitStreak(recentScores);
  const scoreStreakXp = streakBonus(scoreStreak);
  const hydrationStreakXp = hydrationStreakBonus(hydrationStreak);
  const habitStreakXp = habitStreakBonus(habitStreak);

  const recurringXpRaw =
    baseXp +
    completedDayBonus +
    taskFinisherBonus +
    hydrationBonus +
    habitMasteryBonus +
    exerciseBonus +
    reflectionBonus +
    scoreStreakXp +
    hydrationStreakXp +
    habitStreakXp;
  const recurringXp = Math.min(DAILY_RECURRING_XP_CAP, recurringXpRaw);

  await prisma.xPEvent.deleteMany({
    where: {
      userId,
      date: dateUtc,
      reason: "daily_score"
    }
  });

  await prisma.xPEvent.upsert({
    where: {
      userId_date_reason: {
        userId,
        date: dateUtc,
        reason: "daily_recurring"
      }
    },
    create: {
      userId,
      date: dateUtc,
      reason: "daily_recurring",
      xp: recurringXp
    },
    update: {
      xp: recurringXp
    }
  });

  for (const code of milestones.awardedBadges) {
    const reason = `badge:${code}`;
    const existing = await prisma.xPEvent.findFirst({
      where: { userId, reason },
      select: { id: true }
    });
    if (existing) continue;

    await prisma.xPEvent.create({
      data: {
        userId,
        date: dateUtc,
        reason,
        xp: BADGE_XP_REWARD
      }
    });
  }

  for (const code of milestones.completedChallenges) {
    const reason = `challenge:${code}:completed`;
    const existing = await prisma.xPEvent.findFirst({
      where: { userId, reason },
      select: { id: true }
    });
    if (existing) continue;

    await prisma.xPEvent.create({
      data: {
        userId,
        date: dateUtc,
        reason,
        xp: CHALLENGE_XP_REWARD
      }
    });
  }
}
