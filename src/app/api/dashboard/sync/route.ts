import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guard";
import { todayInTimezone } from "@/lib/date";
import { evaluateGamification } from "@/lib/gamification/evaluator";
import { calculateDailyScore } from "@/lib/score/service";
import { upsertXpForDay } from "@/lib/gamification/xp";
import { ensureCarryoverReminder } from "@/lib/notifications";
import { checkRateLimit } from "@/lib/rate-limit";
import { buildRateLimitKey } from "@/lib/request";

export async function POST() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  if (!(await checkRateLimit(buildRateLimitKey(["dashboard-sync", auth.user.id]), 20, 60_000))) {
    return NextResponse.json({ error: "Too many sync requests. Try again shortly." }, { status: 429 });
  }

  const today = todayInTimezone(auth.user.timezone);
  await ensureCarryoverReminder(auth.user.id, auth.user.timezone, today);
  const todayScore = await calculateDailyScore(auth.user.id, today, auth.user.timezone);
  const milestones = await evaluateGamification(auth.user.id, today, auth.user.timezone);
  await upsertXpForDay(auth.user.id, today, auth.user.timezone, todayScore, milestones);

  return NextResponse.json({ ok: true });
}
