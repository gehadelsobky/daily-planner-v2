import { NextResponse } from "next/server";
import { z } from "zod";
import { calculateDailyScore, getDailyEntry } from "@/lib/score/service";
import { dateSchema } from "@/lib/validation/schemas";
import { prisma } from "@/lib/db";
import { formatDateInTimezone, toDateOnlyUtc, todayInTimezone } from "@/lib/date";
import { CarryoverState } from "@prisma/client";
import { SYSTEM_DEFAULT_WATER_TARGET } from "@/lib/score/constants";
import { computeDayStatus } from "@/lib/daily/day-status";
import { requireWorkspaceContext } from "@/lib/saas/workspace-runtime";

const querySchema = z.object({
  date: dateSchema
});

export async function GET(req: Request) {
  const ctx = await requireWorkspaceContext();
  if (!ctx.ok) return ctx.response;
  const { user, workspace } = ctx.context;

  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse({ date: searchParams.get("date") });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid date query" }, { status: 400 });
  }

  const entry = await getDailyEntry(user.id, parsed.data.date, user.timezone, workspace.id);
  const dateUtc = toDateOnlyUtc(parsed.data.date, user.timezone);
  const today = todayInTimezone(user.timezone);
  const todayUtc = toDateOnlyUtc(today, user.timezone);
  const habits = await prisma.habit.findMany({
    where: { userId: user.id, workspaceId: workspace.id, isActive: true },
    orderBy: { name: "asc" }
  });
  const habitLogs = await prisma.habitLog.findMany({
    where: {
      date: dateUtc,
      habit: { is: { userId: user.id, workspaceId: workspace.id } }
    }
  });
  const carryoverTasksRaw = await prisma.task.findMany({
    where: {
      isCompleted: false,
      carryoverState: CarryoverState.pending_review,
      dailyEntry: {
        userId: user.id,
        workspaceId: workspace.id,
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
    sourceDate: formatDateInTimezone(task.dailyEntry.date, user.timezone)
  }));
  const score = await calculateDailyScore(
    user.id,
    parsed.data.date,
    user.timezone,
    entry ?? undefined,
    workspace.id
  );
  const effectiveWaterTarget =
    entry?.waterLog?.target ?? user.waterDefaultTarget ?? SYSTEM_DEFAULT_WATER_TARGET;
  const effectiveWaterUnit = entry?.waterLog?.unit ?? user.waterDefaultUnit;
  const responseEntry = entry ?? {
    id: `virtual-${user.id}-${parsed.data.date}`,
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
