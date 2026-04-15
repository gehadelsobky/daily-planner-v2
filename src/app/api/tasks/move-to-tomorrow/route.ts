import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/guard";
import { parseJson } from "@/lib/http";
import { moveToTomorrowSchema } from "@/lib/validation/schemas";

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const parsed = await parseJson(req, moveToTomorrowSchema);
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

  const existing = Array.isArray(task.dailyEntry.tomorrowItems)
    ? (task.dailyEntry.tomorrowItems as unknown[]).filter((x): x is string => typeof x === "string")
    : [];

  if (!existing.some((item) => item.trim().toLowerCase() === task.title.trim().toLowerCase())) {
    existing.push(task.title);
  }

  await prisma.dailyEntry.update({
    where: { id: task.dailyEntryId },
    data: { tomorrowItems: existing }
  });

  await prisma.task.delete({ where: { id: task.id } });

  return Response.json({ success: true, tomorrow_items: existing });
}
