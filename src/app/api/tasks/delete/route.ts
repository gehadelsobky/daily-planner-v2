import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guard";
import { parseJson } from "@/lib/http";
import { prisma } from "@/lib/db";
import { deleteTaskSchema } from "@/lib/validation/schemas";
import { checkRateLimit } from "@/lib/rate-limit";
import { buildRateLimitKey } from "@/lib/request";

export async function DELETE(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  if (!(await checkRateLimit(buildRateLimitKey(["task-delete", auth.user.id]), 100, 60_000))) {
    return NextResponse.json({ error: "Too many rapid task updates" }, { status: 429 });
  }

  const parsed = await parseJson(req, deleteTaskSchema);
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

  await prisma.task.delete({ where: { id: task.id } });
  return Response.json({ success: true });
}
