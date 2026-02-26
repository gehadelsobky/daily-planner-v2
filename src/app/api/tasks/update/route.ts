import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/guard";
import { parseJson } from "@/lib/http";
import { updateTaskSchema } from "@/lib/validation/schemas";
import { checkRateLimit } from "@/lib/rate-limit";

export async function PATCH(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  if (!checkRateLimit(`task-toggle:${auth.user.id}`, 100, 60_000)) {
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

  const updated = await prisma.task.update({
    where: { id: parsed.data.task_id },
    data: {
      title: parsed.data.title,
      isCompleted: parsed.data.is_completed,
      priority: parsed.data.priority,
      category: parsed.data.category,
      sortOrder: parsed.data.sort_order,
      completedAt: parsed.data.is_completed ? new Date() : null
    }
  });

  return Response.json({ task: updated });
}
