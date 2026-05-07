import { NextResponse } from "next/server";
import { todayInTimezone } from "@/lib/date";
import { evaluateGamification } from "@/lib/gamification/evaluator";
import { calculateDailyScore } from "@/lib/score/service";
import { upsertXpForDay } from "@/lib/gamification/xp";
import { ensureCarryoverReminder } from "@/lib/notifications";
import { checkRateLimit } from "@/lib/rate-limit";
import { buildRateLimitKey } from "@/lib/request";
import { requireWorkspaceContext } from "@/lib/saas/workspace-runtime";

export async function POST() {
  const ctx = await requireWorkspaceContext();
  if (!ctx.ok) return ctx.response;
  const { user, workspace } = ctx.context;

  if (!(await checkRateLimit(buildRateLimitKey(["dashboard-sync", user.id]), 20, 60_000))) {
    return NextResponse.json({ error: "Too many sync requests. Try again shortly." }, { status: 429 });
  }

  const today = todayInTimezone(user.timezone);
  await ensureCarryoverReminder(user.id, user.timezone, today, workspace.id);
  const todayScore = await calculateDailyScore(user.id, today, user.timezone, undefined, workspace.id);
  const milestones = await evaluateGamification(user.id, today, user.timezone, workspace.id);
  await upsertXpForDay(user.id, today, user.timezone, todayScore, milestones, workspace.id);

  return NextResponse.json({ ok: true });
}
