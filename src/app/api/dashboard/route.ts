import { NextResponse } from "next/server";
import { z } from "zod";
import { subDays } from "date-fns";
import { prisma } from "@/lib/db";
import { formatDateInTimezone, toDateOnlyUtc } from "@/lib/date";
import { calculateDailyScore } from "@/lib/score/service";
import { levelFromXp } from "@/lib/gamification";
import { calculateDailyRecurringXpBreakdown } from "@/lib/gamification/xp";
import { requireWorkspaceContext } from "@/lib/saas/workspace-runtime";
import { getWorkspaceUsageSnapshot } from "@/lib/saas/feature-usage";
import { getLockedFeatureStatuses } from "@/lib/saas/plans";

const querySchema = z.object({
  range: z.enum(["week", "month"]).default("week")
});

export async function GET(req: Request) {
  const ctx = await requireWorkspaceContext();
  if (!ctx.ok) return ctx.response;
  const { user, workspace, subscription, planCode, entitlements } = ctx.context;

  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse({ range: searchParams.get("range") ?? "week" });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid range" }, { status: 400 });
  }

  const days = parsed.data.range === "week" ? 7 : 30;
  const now = new Date();
  const today = formatDateInTimezone(now, user.timezone);
  const todayUtc = toDateOnlyUtc(today, user.timezone);
  const todayScore = await calculateDailyScore(user.id, today, user.timezone, undefined, workspace.id);
  const todayRecurring = await calculateDailyRecurringXpBreakdown(
    user.id,
    today,
    user.timezone,
    todayScore,
    workspace.id
  );
  const series = [] as Array<{ date: string; score: number }>;

  for (let i = days - 1; i >= 0; i -= 1) {
    const d = subDays(now, i);
    const date = formatDateInTimezone(d, user.timezone);
    try {
      const score = await calculateDailyScore(user.id, date, user.timezone, undefined, workspace.id);
      series.push({ date, score: score.scorePercent });
    } catch (error) {
      console.error("dashboard series score failed", { date, error });
      series.push({ date, score: 0 });
    }
  }

  const usage = await getWorkspaceUsageSnapshot(workspace.id);

  const xpEvents = await prisma.xPEvent.findMany({
    where: { userId: user.id, workspaceId: workspace.id }
  });
  const totalXp = xpEvents.reduce((sum, e) => sum + e.xp, 0);
  const todayXpEvents = xpEvents.filter((event) => event.date.getTime() === todayUtc.getTime());
  const todayMilestones = todayXpEvents
    .filter((event) => event.reason.startsWith("badge:") || event.reason.startsWith("challenge:"))
    .map((event) => ({ reason: event.reason, xp: event.xp }));
  const todayMilestoneXp = todayMilestones.reduce((sum, event) => sum + event.xp, 0);
  const level = levelFromXp(totalXp);

  const bestDay = series.length
    ? series.reduce((best, item) => (item.score > best.score ? item : best), series[0])
    : { date: today, score: 0 };

  return NextResponse.json({
    range: parsed.data.range,
    workspace: {
      id: workspace.id,
      name: workspace.name,
      planCode,
      billingStatus: subscription.billingStatus,
      usage,
      entitlements,
      lockedFeatures: getLockedFeatureStatuses(entitlements)
    },
    series,
    stats: {
      avgScore: Math.round(series.reduce((sum, d) => sum + d.score, 0) / series.length),
      bestDay
    },
    gamification: {
      totalXp,
      ...level,
      todayXp: {
        date: today,
        recurring: todayRecurring,
        milestones: todayMilestones,
        milestoneXp: todayMilestoneXp,
        totalTodayXp: todayRecurring.recurringCapped + todayMilestoneXp
      },
      badges: await prisma.userBadge.findMany({
        where: { userId: user.id },
        include: { badge: true }
      }),
      challenges: await prisma.userChallenge.findMany({
        where: { userId: user.id },
        include: { challenge: true }
      })
    }
  });
}
