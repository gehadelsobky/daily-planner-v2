import { HabitFrequency, Prisma, WaterUnit } from "@prisma/client";
import { prisma } from "@/lib/db";
import { toDateOnlyUtc } from "@/lib/date";
import { DEFAULT_WEIGHTS, SYSTEM_DEFAULT_WATER_TARGET } from "@/lib/score/constants";
import { computeDailyScore } from "@/lib/score/engine";
import { ScoreWeights } from "@/lib/score/types";
import { formatInTimeZone } from "date-fns-tz";

export async function getEffectiveWeights(userId: string, date: Date): Promise<ScoreWeights> {
  const record = await prisma.scoreSetting.findFirst({
    where: {
      userId,
      effectiveFrom: { lte: date }
    },
    orderBy: { effectiveFrom: "desc" }
  });

  if (!record) return DEFAULT_WEIGHTS;

  return {
    tasks: record.tasksWeight,
    grow: record.growWeight,
    habits: record.habitsWeight,
    exercise: record.exerciseWeight,
    grateful: record.gratefulWeight,
    water: record.waterWeight
  };
}

type DailyData = Prisma.DailyEntryGetPayload<{
  include: {
    tasks: true;
    gratitudeItems: true;
    exerciseLogs: true;
    waterLog: true;
  };
}>;

export async function getOrCreateDailyEntry(userId: string, dateString: string, timezone: string) {
  const date = toDateOnlyUtc(dateString, timezone);
  return prisma.dailyEntry.upsert({
    where: { userId_date: { userId, date } },
    create: { userId, date },
    update: {},
    include: {
      tasks: { orderBy: { sortOrder: "asc" } },
      gratitudeItems: { orderBy: { createdAt: "asc" } },
      exerciseLogs: { orderBy: { createdAt: "asc" } },
      waterLog: true
    }
  });
}

function habitExpectedToday(habit: { frequency: HabitFrequency; customDays: Prisma.JsonValue | null }, day: number) {
  if (habit.frequency === HabitFrequency.daily) return true;
  if (habit.frequency === HabitFrequency.weekdays) return day >= 1 && day <= 5;
  if (habit.frequency === HabitFrequency.custom && Array.isArray(habit.customDays)) {
    return habit.customDays.includes(day);
  }
  return false;
}

export async function calculateDailyScore(userId: string, dateString: string, timezone: string, dailyData?: DailyData) {
  const date = toDateOnlyUtc(dateString, timezone);

  const entry =
    dailyData ??
    (await prisma.dailyEntry.findUnique({
      where: { userId_date: { userId, date } },
      include: { tasks: true, gratitudeItems: true, exerciseLogs: true, waterLog: true }
    }));

  if (!entry) {
    const score = computeDailyScore({
      weights: await getEffectiveWeights(userId, date),
      plannedTasks: 0,
      completedTasks: 0,
      growText: "",
      expectedHabits: 0,
      doneHabits: 0,
      exerciseMinutes: 0,
      gratitudeCount: 0,
      waterConsumed: 0,
      waterTarget: SYSTEM_DEFAULT_WATER_TARGET
    });
    return score;
  }

  const [weights, habits, habitLogs, user] = await Promise.all([
    getEffectiveWeights(userId, date),
    prisma.habit.findMany({ where: { userId, isActive: true } }),
    prisma.habitLog.findMany({
      where: {
        date,
        habit: {
          is: { userId, isActive: true }
        }
      },
      include: { habit: true }
    }),
    prisma.user.findUnique({ where: { id: userId } })
  ]);

  const weekday = Number(formatInTimeZone(date, timezone, "i")) % 7;

  const expectedHabits = habits.filter((h) => habitExpectedToday(h, weekday)).length;
  const doneHabits = habits
    .filter((h) => habitExpectedToday(h, weekday))
    .reduce((sum, habit) => {
      const log = habitLogs.find((l) => l.habitId === habit.id);
      if (!log) return sum;
      if (habit.targetValue && habit.targetValue > 0) {
        const ratio = Math.max(0, Math.min(1, (log.valueDone ?? 0) / habit.targetValue));
        return sum + ratio;
      }
      return sum + (log.isDone ? 1 : 0);
    }, 0);
  const exerciseMinutes = entry.exerciseLogs.reduce((sum, item) => sum + item.minutes, 0);
  const plannedTasks = entry.tasks.length;
  const completedTasks = entry.tasks.filter((t) => t.isCompleted).length;
  const waterTarget =
    entry.waterLog?.target ?? user?.waterDefaultTarget ?? SYSTEM_DEFAULT_WATER_TARGET;
  const waterConsumed = entry.waterLog?.consumed ?? 0;

  return computeDailyScore({
    weights,
    plannedTasks,
    completedTasks,
    growText: entry.growText,
    expectedHabits,
    doneHabits,
    exerciseMinutes,
    gratitudeCount: entry.gratitudeItems.length,
    waterConsumed,
    waterTarget
  });
}

export function normalizeWaterTarget(target: number | null | undefined, unit: WaterUnit): number {
  if (!target || target <= 0) {
    return unit === WaterUnit.ml ? 2000 : SYSTEM_DEFAULT_WATER_TARGET;
  }
  return target;
}
