import { NextResponse } from "next/server";
import { z } from "zod";
import { subDays } from "date-fns";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/guard";
import { formatDateInTimezone, toDateOnlyUtc } from "@/lib/date";
import { calculateDailyScore } from "@/lib/score/service";
import { levelFromXp } from "@/lib/gamification";
import { evaluateGamification } from "@/lib/gamification/evaluator";
import { calculateDailyRecurringXpBreakdown, upsertXpForDay } from "@/lib/gamification/xp";

const querySchema = z.object({
  range: z.enum(["week", "month"]).default("week")
});

export async function GET(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse({ range: searchParams.get("range") ?? "week" });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid range" }, { status: 400 });
  }

  const days = parsed.data.range === "week" ? 7 : 30;
  const now = new Date();
  const today = formatDateInTimezone(now, auth.user.timezone);
  const todayUtc = toDateOnlyUtc(today, auth.user.timezone);
  let todayScore = await calculateDailyScore(auth.user.id, today, auth.user.timezone);
  let todayRecurring = await calculateDailyRecurringXpBreakdown(
    auth.user.id,
    today,
    auth.user.timezone,
    todayScore
  );
  try {
    const milestones = await evaluateGamification(auth.user.id, today, auth.user.timezone);
    await upsertXpForDay(auth.user.id, today, auth.user.timezone, todayScore, milestones);
    todayScore = await calculateDailyScore(auth.user.id, today, auth.user.timezone);
    todayRecurring = await calculateDailyRecurringXpBreakdown(
      auth.user.id,
      today,
      auth.user.timezone,
      todayScore
    );
  } catch (error) {
    console.error("dashboard gamification refresh failed", error);
  }
  const series = [] as Array<{ date: string; score: number }>;

  for (let i = days - 1; i >= 0; i -= 1) {
    const d = subDays(now, i);
    const date = formatDateInTimezone(d, auth.user.timezone);
    try {
      const score = await calculateDailyScore(auth.user.id, date, auth.user.timezone);
      series.push({ date, score: score.scorePercent });
    } catch (error) {
      console.error("dashboard series score failed", { date, error });
      series.push({ date, score: 0 });
    }
  }

  const xpEvents = await prisma.xPEvent.findMany({ where: { userId: auth.user.id } });
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
        where: { userId: auth.user.id },
        include: { badge: true }
      }),
      challenges: await prisma.userChallenge.findMany({
        where: { userId: auth.user.id },
        include: { challenge: true }
      })
    }
  });
}
