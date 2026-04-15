import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/guard";
import { parseJson } from "@/lib/http";
import { updateTaskSchema } from "@/lib/validation/schemas";
import { checkRateLimit } from "@/lib/rate-limit";
import { buildRateLimitKey } from "@/lib/request";

export async function PATCH(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  if (!(await checkRateLimit(buildRateLimitKey(["task-toggle", auth.user.id]), 100, 60_000))) {
    return NextResponse.json({ error: "Too many rapid task updates" }, { status: 429 });
  }

  const parsed = await parseJson(req, updateTaskSchema);
  if (!parsed.ok) return parsed.response;

  const task = await prisma.task.findUnique({
    where: { id: parsed.data.task_id },
    include: { dailyEntry: true }
  });
  if (!task || task.dailyEntry.userId !== auth.user.id) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
  if (task.dailyEntry.closedAt) {
    return NextResponse.json({ error: "This day is closed and can no longer be edited." }, { status: 409 });
  }

  const updated = await prisma.task.update({
    where: { id: parsed.data.task_id },
    data: {
      ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
      ...(parsed.data.is_completed !== undefined
        ? {
            isCompleted: parsed.data.is_completed,
            completedAt: parsed.data.is_completed ? new Date() : null
          }
        : {}),
      ...(parsed.data.priority !== undefined ? { priority: parsed.data.priority } : {}),
      ...(parsed.data.category !== undefined ? { category: parsed.data.category } : {}),
      ...(parsed.data.sort_order !== undefined ? { sortOrder: parsed.data.sort_order } : {})
    }
  });

  return Response.json({ task: updated });
}
