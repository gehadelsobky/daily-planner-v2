import { NextResponse } from "next/server";
import { CarryoverState } from "@prisma/client";
import { requireUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { parseJson } from "@/lib/http";
import { checkRateLimit } from "@/lib/rate-limit";
import { todayInTimezone, toDateOnlyUtc } from "@/lib/date";
import { carryoverActionSchema } from "@/lib/validation/schemas";

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  if (!checkRateLimit(`carryover-action:${auth.user.id}`, 60, 60_000)) {
    return NextResponse.json({ error: "Too many carryover actions. Try again shortly." }, { status: 429 });
  }

  const parsed = await parseJson(req, carryoverActionSchema);
  if (!parsed.ok) return parsed.response;

  const today = todayInTimezone(auth.user.timezone);
  const todayUtc = toDateOnlyUtc(today, auth.user.timezone);
  const targetDate =
    parsed.data.action === "add_today"
      ? today
      : parsed.data.action === "reschedule"
        ? parsed.data.target_date ?? null
        : null;

  if (parsed.data.action === "reschedule" && targetDate && targetDate < today) {
    return NextResponse.json({ error: "Reschedule date must be today or a future date." }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const sourceTasks = await tx.task.findMany({
      where: {
        id: { in: parsed.data.task_ids },
        dailyEntry: { userId: auth.user.id }
      },
      include: { dailyEntry: true }
    });

    const eligible = sourceTasks.filter(
      (task) =>
        !task.isCompleted &&
        task.dailyEntry.date < todayUtc &&
        task.carryoverState === CarryoverState.pending_review
    );

    if (!eligible.length) {
      return { handled: 0, created: 0, skippedDuplicates: 0, targetDate };
    }

    if (parsed.data.action === "dismiss") {
      const update = await tx.task.updateMany({
        where: { id: { in: eligible.map((task) => task.id) } },
        data: {
          carryoverState: CarryoverState.dismissed,
          carryoverUpdatedAt: new Date()
        }
      });
      return { handled: update.count, created: 0, skippedDuplicates: 0, targetDate: null };
    }

    const targetDateUtc = toDateOnlyUtc(targetDate!, auth.user.timezone);
    const entry = await tx.dailyEntry.upsert({
      where: { userId_date: { userId: auth.user.id, date: targetDateUtc } },
      create: { userId: auth.user.id, date: targetDateUtc },
      update: {}
    });

    const existingTasks = await tx.task.findMany({
      where: { dailyEntryId: entry.id },
      select: { title: true, sortOrder: true }
    });

    const existingTitles = new Set(existingTasks.map((task) => task.title.trim().toLowerCase()));
    let maxSortOrder = existingTasks.reduce((max, task) => Math.max(max, task.sortOrder), 0);

    let created = 0;
    let skippedDuplicates = 0;

    for (const task of eligible) {
      const normalizedTitle = task.title.trim().toLowerCase();
      if (!normalizedTitle || existingTitles.has(normalizedTitle)) {
        skippedDuplicates += 1;
        continue;
      }

      maxSortOrder += 1;
      await tx.task.create({
        data: {
          dailyEntryId: entry.id,
          title: task.title,
          priority: task.priority,
          category: task.category,
          sortOrder: maxSortOrder,
          sourceTaskId: task.id
        }
      });
      existingTitles.add(normalizedTitle);
      created += 1;
    }

    const handledState =
      parsed.data.action === "add_today" ? CarryoverState.added_to_today : CarryoverState.rescheduled;

    const updated = await tx.task.updateMany({
      where: { id: { in: eligible.map((task) => task.id) } },
      data: {
        carryoverState: handledState,
        carryoverUpdatedAt: new Date()
      }
    });

    return {
      handled: updated.count,
      created,
      skippedDuplicates,
      targetDate
    };
  });

  return NextResponse.json({
    ok: true,
    ...result
  });
}
