import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/guard";
import { parseJson } from "@/lib/http";
import { dateSchema } from "@/lib/validation/schemas";
import { runForTomorrowMigration } from "@/lib/jobs/for-tomorrow";
import { todayInTimezone } from "@/lib/date";
import { ensureCarryoverReminder } from "@/lib/notifications";
import { evaluateGamification } from "@/lib/gamification/evaluator";
import { upsertXpForDay } from "@/lib/gamification/xp";
import { calculateDailyScore } from "@/lib/score/service";
import { checkRateLimit } from "@/lib/rate-limit";
import { buildRateLimitKey } from "@/lib/request";

const syncSchema = z.object({
  date: dateSchema
});

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const parsed = await parseJson(req, syncSchema);
  if (!parsed.ok) return parsed.response;

  if (!(await checkRateLimit(buildRateLimitKey(["daily-sync", auth.user.id, parsed.data.date]), 30, 60_000))) {
    return NextResponse.json({ error: "Too many sync requests. Try again shortly." }, { status: 429 });
  }

  await runForTomorrowMigration(auth.user.id, parsed.data.date, auth.user.timezone);

  const today = todayInTimezone(auth.user.timezone);
  await ensureCarryoverReminder(auth.user.id, auth.user.timezone, today);

  const score = await calculateDailyScore(auth.user.id, parsed.data.date, auth.user.timezone);
  const milestones = await evaluateGamification(auth.user.id, parsed.data.date, auth.user.timezone);
  await upsertXpForDay(auth.user.id, parsed.data.date, auth.user.timezone, score, milestones);

  return NextResponse.json({ ok: true });
}
