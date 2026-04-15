import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/guard";
import { calculateDailyScore, getDailyEntry } from "@/lib/score/service";
import { dateSchema } from "@/lib/validation/schemas";
import { prisma } from "@/lib/db";
import { formatDateInTimezone, toDateOnlyUtc, todayInTimezone } from "@/lib/date";
import { CarryoverState } from "@prisma/client";
import { SYSTEM_DEFAULT_WATER_TARGET } from "@/lib/score/constants";
import { computeDayStatus } from "@/lib/daily/day-status";

const querySchema = z.object({
  date: dateSchema
});

export async function GET(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse({ date: searchParams.get("date") });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid date query" }, { status: 400 });
  }

  const entry = await getDailyEntry(auth.user.id, parsed.data.date, auth.user.timezone);
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
  const score = await calculateDailyScore(auth.user.id, parsed.data.date, auth.user.timezone, entry ?? undefined);
  const effectiveWaterTarget =
    entry?.waterLog?.target ?? auth.user.waterDefaultTarget ?? SYSTEM_DEFAULT_WATER_TARGET;
  const effectiveWaterUnit = entry?.waterLog?.unit ?? auth.user.waterDefaultUnit;
  const responseEntry = entry ?? {
    id: `virtual-${auth.user.id}-${parsed.data.date}`,
    closedAt: null,
    growText: null,
    notesText: null,
    tomorrowItems: [],
    topWinsItems: [],
    quoteItems: [],
    tasks: [],
    gratitudeItems: [],
    exerciseLogs: [],
    waterLog: null
  };
  const dayStatus = computeDayStatus({
    selectedDate: parsed.data.date,
    today,
    closedAt: responseEntry.closedAt,
    scorePercent: score.scorePercent,
    breakdown: score.breakdown,
    taskCount: responseEntry.tasks.length,
    completedTaskCount: responseEntry.tasks.filter((t) => t.isCompleted).length,
    growText: responseEntry.growText,
    notesText: responseEntry.notesText,
    gratitudeCount: responseEntry.gratitudeItems.length,
    exerciseCount: responseEntry.exerciseLogs.length,
    waterConsumed: responseEntry.waterLog?.consumed ?? 0,
    tomorrowItemsCount: Array.isArray(responseEntry.tomorrowItems) ? responseEntry.tomorrowItems.length : 0,
    topWinsCount: Array.isArray(responseEntry.topWinsItems) ? responseEntry.topWinsItems.length : 0,
    quoteCount: Array.isArray(responseEntry.quoteItems) ? responseEntry.quoteItems.length : 0
  });

  return NextResponse.json({
    entry: responseEntry,
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
