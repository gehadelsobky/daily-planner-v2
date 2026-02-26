import { NextResponse } from "next/server";
import { CarryoverState, NotificationStatus } from "@prisma/client";
import { requireUser } from "@/lib/auth/guard";
import { parseJson } from "@/lib/http";
import { prisma } from "@/lib/db";
import { notificationActionSchema } from "@/lib/validation/schemas";
import { todayInTimezone, toDateOnlyUtc } from "@/lib/date";

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const parsed = await parseJson(req, notificationActionSchema);
  if (!parsed.ok) return parsed.response;

  const notification = await prisma.notification.findFirst({
    where: { id: parsed.data.notification_id, userId: auth.user.id }
  });

  if (!notification) {
    return NextResponse.json({ error: "Notification not found" }, { status: 404 });
  }

  const payload = notification.payload as { taskIds?: string[] } | null;
  const taskIds = Array.isArray(payload?.taskIds) ? payload.taskIds : [];

  if (!taskIds.length) {
    await prisma.notification.update({
      where: { id: notification.id },
      data: { status: NotificationStatus.read, readAt: new Date() }
    });
    return NextResponse.json({ ok: true, updated: 0 });
  }

  if (parsed.data.action === "dismiss") {
    await prisma.$transaction([
      prisma.task.updateMany({
        where: {
          id: { in: taskIds },
          dailyEntry: { userId: auth.user.id },
          isCompleted: false,
          carryoverState: CarryoverState.pending_review
        },
        data: { carryoverState: CarryoverState.dismissed, carryoverUpdatedAt: new Date() }
      }),
      prisma.notification.update({
        where: { id: notification.id },
        data: { status: NotificationStatus.dismissed, readAt: new Date() }
      })
    ]);

    return NextResponse.json({ ok: true });
  }

  const today = todayInTimezone(auth.user.timezone);
  const todayUtc = toDateOnlyUtc(today, auth.user.timezone);

  const result = await prisma.$transaction(async (tx) => {
    const sourceTasks = await tx.task.findMany({
      where: {
        id: { in: taskIds },
        dailyEntry: { userId: auth.user.id },
        isCompleted: false,
        carryoverState: CarryoverState.pending_review
      },
      orderBy: { createdAt: "asc" }
    });

    const entry = await tx.dailyEntry.upsert({
      where: { userId_date: { userId: auth.user.id, date: todayUtc } },
      create: { userId: auth.user.id, date: todayUtc },
      update: {}
    });

    const existingTasks = await tx.task.findMany({
      where: { dailyEntryId: entry.id },
      select: { title: true, sortOrder: true }
    });

    const existingTitles = new Set(existingTasks.map((task) => task.title.trim().toLowerCase()));
    let maxSortOrder = existingTasks.reduce((max, task) => Math.max(max, task.sortOrder), 0);
    let created = 0;

    for (const sourceTask of sourceTasks) {
      const normalizedTitle = sourceTask.title.trim().toLowerCase();
      if (!normalizedTitle || existingTitles.has(normalizedTitle)) continue;

      maxSortOrder += 1;
      await tx.task.create({
        data: {
          dailyEntryId: entry.id,
          title: sourceTask.title,
          priority: sourceTask.priority,
          category: sourceTask.category,
          sortOrder: maxSortOrder,
          sourceTaskId: sourceTask.id
        }
      });
      existingTitles.add(normalizedTitle);
      created += 1;
    }

    await tx.task.updateMany({
      where: { id: { in: sourceTasks.map((task) => task.id) } },
      data: {
        carryoverState: CarryoverState.added_to_today,
        carryoverUpdatedAt: new Date()
      }
    });

    await tx.notification.update({
      where: { id: notification.id },
      data: { status: NotificationStatus.read, readAt: new Date() }
    });

    return { created };
  });

  return NextResponse.json({ ok: true, ...result });
}
