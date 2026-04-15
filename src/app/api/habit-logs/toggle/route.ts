import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guard";
import { parseJson } from "@/lib/http";
import { habitToggleSchema } from "@/lib/validation/schemas";
import { prisma } from "@/lib/db";
import { toDateOnlyUtc } from "@/lib/date";
import { checkRateLimit } from "@/lib/rate-limit";
import { buildRateLimitKey } from "@/lib/request";
import { rejectIfDayClosed } from "@/lib/daily/locks";

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  if (!(await checkRateLimit(buildRateLimitKey(["habit-toggle", auth.user.id]), 120, 60_000))) {
    return NextResponse.json({ error: "Too many rapid updates" }, { status: 429 });
  }

  const parsed = await parseJson(req, habitToggleSchema);
  if (!parsed.ok) return parsed.response;

  const habit = await prisma.habit.findUnique({ where: { id: parsed.data.habit_id } });
  if (!habit || habit.userId !== auth.user.id) {
    return NextResponse.json({ error: "Habit not found" }, { status: 404 });
  }

  const date = toDateOnlyUtc(parsed.data.date, auth.user.timezone);
  const closedResponse = await rejectIfDayClosed(auth.user.id, date);
  if (closedResponse) return closedResponse;

  const valueDone = parsed.data.value_done;
  const computedIsDone =
    valueDone !== undefined && habit.targetValue && habit.targetValue > 0
      ? valueDone >= habit.targetValue
      : parsed.data.is_done ?? false;

  const log = await prisma.habitLog.upsert({
    where: { habitId_date: { habitId: habit.id, date } },
    create: {
      habitId: habit.id,
      date,
      isDone: computedIsDone,
      valueDone
    },
    update: {
      isDone: computedIsDone,
      valueDone
    }
  });

  return Response.json({ log });
}
