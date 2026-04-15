import { NextResponse } from "next/server";
import { CarryoverState } from "@prisma/client";
import { requireUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { parseJson } from "@/lib/http";
import { checkRateLimit } from "@/lib/rate-limit";
import { closeDaySchema } from "@/lib/validation/schemas";
import { formatDateInTimezone, toDateOnlyUtc } from "@/lib/date";
import { calculateDailyScore } from "@/lib/score/service";
import { computeDayStatus } from "@/lib/daily/day-status";
import { buildRateLimitKey } from "@/lib/request";

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  if (!(await checkRateLimit(buildRateLimitKey(["close-day", auth.user.id]), 20, 60_000))) {
    return NextResponse.json({ error: "Too many close day actions. Try again shortly." }, { status: 429 });
  }

  const parsed = await parseJson(req, closeDaySchema);
  if (!parsed.ok) return parsed.response;

  const today = formatDateInTimezone(new Date(), auth.user.timezone);
  if (parsed.data.date > today) {
    return NextResponse.json({ error: "You can only close today or a past day." }, { status: 400 });
  }

  const selectedDateUtc = toDateOnlyUtc(parsed.data.date, auth.user.timezone);
  const tomorrowDate = shiftDate(parsed.data.date, 1);
  const tomorrowDateUtc = toDateOnlyUtc(tomorrowDate, auth.user.timezone);
  const taskActionMap = new Map(
    (parsed.data.incomplete_task_actions ?? []).map((item) => [item.task_id, item.action] as const)
  );

  const result = await prisma.$transaction(async (tx) => {
    const entry = await tx.dailyEntry.findUnique({
      where: { userId_date: { userId: auth.user.id, date: selectedDateUtc } },
      include: {
        tasks: { orderBy: { sortOrder: "asc" } }
      }
    });

    if (!entry) {
      return null;
    }

    const incompleteTasks = entry.tasks.filter((task) => !task.isCompleted);
    const carryIds = incompleteTasks
      .filter((task) => (taskActionMap.get(task.id) ?? "carry_to_tomorrow") === "carry_to_tomorrow")
      .map((task) => task.id);
    const dismissIds = incompleteTasks
      .filter((task) => (taskActionMap.get(task.id) ?? "carry_to_tomorrow") === "dismiss")
      .map((task) => task.id);

    let carried = 0;
    let dismissed = 0;
    let duplicateSkips = 0;

    if (carryIds.length) {
      const targetEntry = await tx.dailyEntry.upsert({
        where: { userId_date: { userId: auth.user.id, date: tomorrowDateUtc } },
        create: { userId: auth.user.id, date: tomorrowDateUtc },
        update: {}
      });

      const existingTasks = await tx.task.findMany({
        where: { dailyEntryId: targetEntry.id },
        select: { title: true, sortOrder: true }
      });
      const existingTitles = new Set(existingTasks.map((task) => task.title.trim().toLowerCase()));
      let maxSortOrder = existingTasks.reduce((max, task) => Math.max(max, task.sortOrder), 0);

      for (const task of incompleteTasks.filter((item) => carryIds.includes(item.id))) {
        const normalizedTitle = task.title.trim().toLowerCase();
        if (!normalizedTitle || existingTitles.has(normalizedTitle)) {
          duplicateSkips += 1;
          continue;
        }

        maxSortOrder += 1;
        await tx.task.create({
          data: {
            dailyEntryId: targetEntry.id,
            title: task.title,
            priority: task.priority,
            category: task.category,
            sortOrder: maxSortOrder,
            sourceTaskId: task.id
          }
        });
        existingTitles.add(normalizedTitle);
        carried += 1;
      }

      await tx.task.updateMany({
        where: { id: { in: carryIds } },
        data: {
          carryoverState: CarryoverState.rescheduled,
          carryoverUpdatedAt: new Date()
        }
      });
    }

    if (dismissIds.length) {
      const update = await tx.task.updateMany({
        where: { id: { in: dismissIds } },
        data: {
          carryoverState: CarryoverState.dismissed,
          carryoverUpdatedAt: new Date()
        }
      });
      dismissed = update.count;
    }

    const updatedEntry = await tx.dailyEntry.update({
      where: { id: entry.id },
      data: { closedAt: new Date() },
      include: {
        tasks: { orderBy: { sortOrder: "asc" } },
        gratitudeItems: true,
        exerciseLogs: true,
        waterLog: true
      }
    });

    return {
      entry: updatedEntry,
      summary: {
        carried,
        dismissed,
        duplicateSkips
      }
    };
  });

  if (!result) {
    return NextResponse.json({ error: "Day entry not found." }, { status: 404 });
  }

  const score = await calculateDailyScore(auth.user.id, parsed.data.date, auth.user.timezone, result.entry);
  const dayStatus = computeDayStatus({
    selectedDate: parsed.data.date,
    today,
    closedAt: result.entry.closedAt,
    scorePercent: score.scorePercent,
    breakdown: score.breakdown,
    taskCount: result.entry.tasks.length,
    completedTaskCount: result.entry.tasks.filter((task) => task.isCompleted).length,
    growText: result.entry.growText,
    notesText: result.entry.notesText,
    gratitudeCount: result.entry.gratitudeItems.length,
    exerciseCount: result.entry.exerciseLogs.length,
    waterConsumed: result.entry.waterLog?.consumed ?? 0,
    tomorrowItemsCount: Array.isArray(result.entry.tomorrowItems) ? result.entry.tomorrowItems.length : 0,
    topWinsCount: Array.isArray(result.entry.topWinsItems) ? result.entry.topWinsItems.length : 0,
    quoteCount: Array.isArray(result.entry.quoteItems) ? result.entry.quoteItems.length : 0
  });

  return NextResponse.json({
    ok: true,
    closed_at: result.entry.closedAt,
    day_status: dayStatus,
    summary: result.summary
  });
}

function shiftDate(date: string, byDays: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + byDays);
  return d.toISOString().slice(0, 10);
}
