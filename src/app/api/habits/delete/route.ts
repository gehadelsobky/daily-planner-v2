import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guard";
import { parseJson } from "@/lib/http";
import { prisma } from "@/lib/db";
import { habitDeleteSchema } from "@/lib/validation/schemas";
import { checkRateLimit } from "@/lib/rate-limit";
import { buildRateLimitKey } from "@/lib/request";

export async function DELETE(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  if (!(await checkRateLimit(buildRateLimitKey(["habit-delete", auth.user.id]), 40, 60_000))) {
    return NextResponse.json({ error: "Too many rapid habit updates" }, { status: 429 });
  }

  const parsed = await parseJson(req, habitDeleteSchema);
  if (!parsed.ok) return parsed.response;

  const habit = await prisma.habit.findUnique({
    where: { id: parsed.data.habit_id }
  });

  if (!habit || habit.userId !== auth.user.id) {
    return NextResponse.json({ error: "Habit not found" }, { status: 404 });
  }

  await prisma.habit.delete({
    where: { id: habit.id }
  });

  return Response.json({ success: true });
}
