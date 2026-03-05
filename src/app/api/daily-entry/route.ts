import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/guard";
import { calculateDailyScore, getOrCreateDailyEntry } from "@/lib/score/service";
import { runForTomorrowMigration } from "@/lib/jobs/for-tomorrow";
import { dateSchema } from "@/lib/validation/schemas";
import { prisma } from "@/lib/db";
import { formatDateInTimezone, toDateOnlyUtc, todayInTimezone } from "@/lib/date";
import { CarryoverState } from "@prisma/client";
import { evaluateGamification } from "@/lib/gamification/evaluator";
import { upsertXpForDay } from "@/lib/gamification/xp";
import { SYSTEM_DEFAULT_WATER_TARGET } from "@/lib/score/constants";
import { ensureCarryoverReminder } from "@/lib/notifications";

const querySchema = z.object({
  date: dateSchema
});

const PAST_DAY_COMPLETION_THRESHOLD = 75;
const REQUIRED_KEYS = new Set(["tasks", "grow", "water"]);
const MIN_REQUIRED_SECTIONS_MET = 2;

export async function GET(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse({ date: searchParams.get("date") });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid date query" }, { status: 400 });
  }

  await runForTomorrowMigration(auth.user.id, parsed.data.date, auth.user.timezone);

  const entry = await getOrCreateDailyEntry(auth.user.id, parsed.data.date, auth.user.timezone);
  const dateUtc = toDateOnlyUtc(parsed.data.date, auth.user.timezone);
  const today = todayInTimezone(auth.user.timezone);
  const todayUtc = toDateOnlyUtc(today, auth.user.timezone);
  const habits = await prisma.habit.findMany({
    where: { userId: auth.user.id, isActive: true },
    orderBy: { name: "asc" }
  });
  const habitLogs = await prisma.habitLog.findMany({
    where: {
      date: dateUtc,
      habit: { is: { userId: auth.user.id } }
    }
  });
  const carryoverTasksRaw = await prisma.task.findMany({
    where: {
      isCompleted: false,
      carryoverState: CarryoverState.pending_review,
      dailyEntry: {
        userId: auth.user.id,
        date: { lt: todayUtc }
      }
    },
    include: {
      dailyEntry: {
        select: { date: true }
      }
    },
    orderBy: [{ dailyEntry: { date: "asc" } }, { createdAt: "asc" }],
    take: 200
  });
  const carryoverTasks = carryoverTasksRaw.map((task) => ({
    id: task.id,
    title: task.title,
    priority: task.priority,
    sourceDate: formatDateInTimezone(task.dailyEntry.date, auth.user.timezone)
  }));
  const score = await calculateDailyScore(auth.user.id, parsed.data.date, auth.user.timezone, entry);
  await ensureCarryoverReminder(auth.user.id, auth.user.timezone, today);
  const effectiveWaterTarget =
    entry.waterLog?.target ?? auth.user.waterDefaultTarget ?? SYSTEM_DEFAULT_WATER_TARGET;
  const effectiveWaterUnit = entry.waterLog?.unit ?? auth.user.waterDefaultUnit;
  const milestones = await evaluateGamification(auth.user.id, parsed.data.date, auth.user.timezone);
  await upsertXpForDay(auth.user.id, parsed.data.date, auth.user.timezone, score, milestones);
  const hasPlannedTasks = entry.tasks.length > 0;
  const allTasksCompleted = hasPlannedTasks && entry.tasks.every((t) => t.isCompleted);
  const requiredBreakdown = score.breakdown.filter((item) => REQUIRED_KEYS.has(item.key));
  const activeRequiredBreakdown = requiredBreakdown.filter((item) => !item.na);
  const requiredMet = activeRequiredBreakdown.filter(
    (item) => (item.normalizedScore ?? 0) >= 1
  ).length;
  const minRequiredMet = Math.min(MIN_REQUIRED_SECTIONS_MET, activeRequiredBreakdown.length);
  const pastDayCompleted =
    score.scorePercent >= PAST_DAY_COMPLETION_THRESHOLD && requiredMet >= minRequiredMet;

  let dayStatus: "not_started" | "in_progress" | "completed" | "incomplete";
  if (parsed.data.date < today) {
    dayStatus = pastDayCompleted ? "completed" : "incomplete";
  } else if (entry.tasks.length === 0 && !entry.growText && !entry.notesText) {
    dayStatus = "not_started";
  } else if (allTasksCompleted) {
    dayStatus = "completed";
  } else {
    dayStatus = "in_progress";
  }

  return NextResponse.json({
    entry,
    habits,
    habitLogs,
    score,
    dayStatus,
    carryoverTasks,
    todayDate: today,
    waterDefaults: {
      target: effectiveWaterTarget,
      unit: effectiveWaterUnit
    }
  });
}
