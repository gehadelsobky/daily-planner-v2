import { CarryoverState, NotificationStatus, NotificationType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { toDateOnlyUtc } from "@/lib/date";

export async function ensureCarryoverReminder(userId: string, timezone: string, todayDate: string) {
  const todayUtc = toDateOnlyUtc(todayDate, timezone);
  const carryoverTasks = await prisma.task.findMany({
    where: {
      isCompleted: false,
      carryoverState: CarryoverState.pending_review,
      dailyEntry: {
        userId,
        date: { lt: todayUtc }
      }
    },
    select: { id: true },
    take: 200
  });

  if (!carryoverTasks.length) return;

  const dedupeKey = `carryover:${userId}:${todayDate}`;
  const taskIds = carryoverTasks.map((task) => task.id);
  const title = `Unfinished tasks reminder (${taskIds.length})`;
  const body = `You still have ${taskIds.length} unfinished tasks from previous days.`;

  await prisma.notification.upsert({
    where: { dedupeKey },
    create: {
      userId,
      type: NotificationType.carryover_tasks,
      title,
      body,
      payload: { taskIds, count: taskIds.length, date: todayDate },
      dedupeKey,
      status: NotificationStatus.unread
    },
    update: {
      title,
      body,
      payload: { taskIds, count: taskIds.length, date: todayDate }
    }
  });
}
