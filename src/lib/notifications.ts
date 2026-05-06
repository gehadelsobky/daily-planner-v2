import { CarryoverState, NotificationStatus, NotificationType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { toDateOnlyUtc } from "@/lib/date";
import { requireCurrentWorkspace } from "@/lib/saas/workspace-context";

export async function ensureCarryoverReminder(
  userId: string,
  timezone: string,
  todayDate: string,
  workspaceId?: string
) {
  const resolvedWorkspaceId = workspaceId ?? (await requireCurrentWorkspace(userId)).id;
  const todayUtc = toDateOnlyUtc(todayDate, timezone);
  const carryoverTasks = await prisma.task.findMany({
    where: {
      isCompleted: false,
      carryoverState: CarryoverState.pending_review,
      dailyEntry: {
        userId,
        workspaceId: resolvedWorkspaceId,
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
      workspaceId: resolvedWorkspaceId,
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
