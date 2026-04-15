"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { apiFetch } from "@/lib/fetcher";
import { Badge } from "@/components/ui/badge";

type DashboardResponse = {
  range: "week" | "month";
  series: Array<{ date: string; score: number }>;
  stats: { avgScore: number; bestDay: { date: string; score: number } };
  gamification: {
    totalXp: number;
    level: number;
    currentLevelXp: number;
    nextLevelXp: number;
    todayXp: {
      date: string;
      recurring: {
        baseXp: number;
        bonuses: {
          completedDay: number;
          taskFinisher: number;
          hydration: number;
          habitMastery: number;
          exercise: number;
          reflection: number;
        };
        streaks: {
          scoreStreakDays: number;
          scoreStreakXp: number;
          hydrationStreakDays: number;
          hydrationStreakXp: number;
          habitStreakDays: number;
          habitStreakXp: number;
        };
        recurringRaw: number;
        recurringCapped: number;
        capApplied: boolean;
      };
      milestones: Array<{ reason: string; xp: number }>;
      milestoneXp: number;
      totalTodayXp: number;
    };
    badges: Array<{ earnedOn: string; badge: { name: string; description: string } }>;
    challenges: Array<{
      joinedOn: string;
      progress: unknown;
      challenge: { name: string; description: string; endDate: string };
    }>;
  };
};

export default function DashboardPage() {
  const [range, setRange] = useState<"week" | "month">("week");
  const sync = useQuery({
    queryKey: ["dashboard-sync"],
    queryFn: () =>
      apiFetch<{ ok: true }>("/api/dashboard/sync", {
        method: "POST",
        body: JSON.stringify({})
      })
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard", range],
    queryFn: () => apiFetch<DashboardResponse>(`/api/dashboard?range=${range}`),
    enabled: sync.isSuccess
  });

  const levelProgress = data
    ? (data.gamification.currentLevelXp / data.gamification.nextLevelXp) * 100
    : 0;
  const weeklyReview = useMemo(() => {
    const series = data?.series ?? [];
    if (!series.length) {
      return {
        strongDays: 0,
        resetDays: 0,
        successRate: 0,
        momentum: "No data yet",
        highlights: [] as string[],
        focusAreas: [] as string[]
      };
    }

    const strongDays = series.filter((item) => item.score >= 75).length;
    const resetDays = series.filter((item) => item.score < 50).length;
    const successRate = Math.round((strongDays / series.length) * 100);
    const firstScore = series[0]?.score ?? 0;
    const lastScore = series[series.length - 1]?.score ?? 0;
    const trendDelta = lastScore - firstScore;
    const momentum =
      trendDelta >= 10
        ? "Rising"
        : trendDelta <= -10
          ? "Dropping"
          : "Stable";

    const highlights = [
      data?.stats.bestDay
        ? `Best day was ${formatShortDate(data.stats.bestDay.date)} with ${data.stats.bestDay.score}%.`
        : null,
      strongDays > 0
        ? `${strongDays} day${strongDays === 1 ? "" : "s"} reached the strong zone (75%+).`
        : "No strong-zone days yet this week.",
      (data?.gamification.todayXp.totalTodayXp ?? 0) > 0
        ? `You earned ${data?.gamification.todayXp.totalTodayXp ?? 0} XP today.`
        : "No XP earned today yet."
    ].filter(Boolean) as string[];

    const focusAreas = [
      successRate >= 70
        ? "You have a strong base. Focus on protecting consistency next week."
        : "Next week should focus on consistency before intensity.",
      resetDays >= 2
        ? "Too many low-score days appeared. Reduce the daily load and protect the basics first."
        : "Low-score days stayed limited. Keep using the same recovery pattern.",
      (data?.gamification.todayXp.recurring.streaks.scoreStreakDays ?? 0) >= 3
        ? `Your score streak is ${data?.gamification.todayXp.recurring.streaks.scoreStreakDays} days. Preserve it with a lighter but complete day plan.`
        : "Build a new streak by planning fewer tasks and closing the core sections daily."
    ];

    return {
      strongDays,
      resetDays,
      successRate,
      momentum,
      highlights,
      focusAreas
    };
  }, [data]);

  return (
    <main className="mx-auto max-w-5xl space-y-4 px-4 py-6">
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Performance Hub</p>
              <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
            </div>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Review your momentum, XP growth, and consistency patterns so the next week becomes easier to plan.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-white/80 px-4 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Average</p>
              <p className="mt-1 text-2xl font-semibold">{data?.stats.avgScore ?? 0}%</p>
            </div>
            <div className="rounded-2xl border border-border bg-white/80 px-4 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Level</p>
              <p className="mt-1 text-2xl font-semibold">{data?.gamification.level ?? 1}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant={range === "week" ? "default" : "secondary"} onClick={() => setRange("week")}>
            Week
          </Button>
          <Button variant={range === "month" ? "default" : "secondary"} onClick={() => setRange("month")}>
            Month
          </Button>
        </div>
      </Card>

      {sync.isLoading || isLoading ? (
        <Card>
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </Card>
      ) : null}

      {sync.isError || isError ? (
        <Card>
          <p className="text-sm text-destructive">Failed to load dashboard data. Please refresh and try again.</p>
        </Card>
      ) : null}

      <Card className="space-y-2">
        <h2 className="font-semibold">Average Score</h2>
        <p className="text-3xl font-bold">{data?.stats.avgScore ?? 0}%</p>
        <p className="text-sm text-muted-foreground">
          Best day: {data?.stats.bestDay.date} ({data?.stats.bestDay.score}%)
        </p>
      </Card>

      {range === "week" ? (
        <Card className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold">Weekly Review</h2>
              <p className="text-sm text-muted-foreground">
                A quick reflection on momentum, consistency, and where to focus next.
              </p>
            </div>
            <Badge>{weeklyReview.momentum} momentum</Badge>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <StatTile label="Strong Days" value={`${weeklyReview.strongDays}`} hint="75% or higher" />
            <StatTile label="Reset Days" value={`${weeklyReview.resetDays}`} hint="Below 50%" />
            <StatTile label="Success Rate" value={`${weeklyReview.successRate}%`} hint="Strong days this week" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-border p-4">
              <h3 className="font-medium">What went well</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {weeklyReview.highlights.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-border p-4">
              <h3 className="font-medium">Next week focus</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {weeklyReview.focusAreas.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      ) : null}

      <Card className="space-y-3">
        <h2 className="font-semibold">Level & XP</h2>
        <p>Level {data?.gamification.level ?? 1}</p>
        <Progress value={levelProgress} />
        <p className="text-sm text-muted-foreground">Total XP: {data?.gamification.totalXp ?? 0}</p>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-semibold">Today XP Breakdown</h2>
        {data?.gamification.todayXp ? (
          <div className="space-y-2 text-sm">
            <Row label="Date" value={data.gamification.todayXp.date} />
            <Row label="Base XP (score)" value={`+${data.gamification.todayXp.recurring.baseXp}`} />
            <Row label="Completed day bonus" value={`+${data.gamification.todayXp.recurring.bonuses.completedDay}`} />
            <Row label="Task finisher bonus" value={`+${data.gamification.todayXp.recurring.bonuses.taskFinisher}`} />
            <Row label="Hydration bonus" value={`+${data.gamification.todayXp.recurring.bonuses.hydration}`} />
            <Row label="Habit mastery bonus" value={`+${data.gamification.todayXp.recurring.bonuses.habitMastery}`} />
            <Row label="Exercise bonus" value={`+${data.gamification.todayXp.recurring.bonuses.exercise}`} />
            <Row label="Reflection bonus" value={`+${data.gamification.todayXp.recurring.bonuses.reflection}`} />
            <Row
              label={`Score streak (${data.gamification.todayXp.recurring.streaks.scoreStreakDays}d)`}
              value={`+${data.gamification.todayXp.recurring.streaks.scoreStreakXp}`}
            />
            <Row
              label={`Hydration streak (${data.gamification.todayXp.recurring.streaks.hydrationStreakDays}d)`}
              value={`+${data.gamification.todayXp.recurring.streaks.hydrationStreakXp}`}
            />
            <Row
              label={`Habit streak (${data.gamification.todayXp.recurring.streaks.habitStreakDays}d)`}
              value={`+${data.gamification.todayXp.recurring.streaks.habitStreakXp}`}
            />
            <Row label="Recurring XP (before cap)" value={`${data.gamification.todayXp.recurring.recurringRaw}`} />
            <Row label="Recurring XP (after cap)" value={`${data.gamification.todayXp.recurring.recurringCapped}`} />
            {data.gamification.todayXp.recurring.capApplied ? (
              <p className="text-xs text-muted-foreground">
                Daily recurring cap applied ({data.gamification.todayXp.recurring.recurringRaw} to{" "}
                {data.gamification.todayXp.recurring.recurringCapped}).
              </p>
            ) : null}
            <Row label="Milestone XP today" value={`+${data.gamification.todayXp.milestoneXp}`} />
            {data.gamification.todayXp.milestones.length ? (
              <ul className="space-y-1 text-xs text-muted-foreground">
                {data.gamification.todayXp.milestones.map((event, idx) => (
                  <li key={`${event.reason}-${idx}`}>
                    {event.reason} (+{event.xp})
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">No badge/challenge XP milestones today.</p>
            )}
            <div className="border-t border-border pt-2">
              <Row label="Total XP earned today" value={`${data.gamification.todayXp.totalTodayXp}`} strong />
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No XP breakdown available.</p>
        )}
      </Card>

      <Card className="space-y-3">
        <h2 className="font-semibold">Badges</h2>
        {data?.gamification.badges?.length ? (
          <div className="flex flex-wrap gap-2">
            {data.gamification.badges.map((badge) => (
              <div key={`${badge.badge.name}-${badge.earnedOn}`} className="rounded-full bg-secondary px-3 py-1 text-sm">
                {badge.badge.name}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No badges earned yet.</p>
        )}
      </Card>

      <Card className="space-y-3">
        <h2 className="font-semibold">Challenges</h2>
        {data?.gamification.challenges?.length ? (
          <ul className="space-y-2 text-sm">
            {data.gamification.challenges.map((item) => (
              <li key={`${item.challenge.name}-${item.joinedOn}`} className="rounded-md border border-border p-3">
                <p className="font-medium">{item.challenge.name}</p>
                <p className="text-xs text-muted-foreground">{item.challenge.description}</p>
                <p className="mt-1 text-xs text-muted-foreground">Ends: {item.challenge.endDate.slice(0, 10)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Progress: {formatProgress(item.progress)}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No active challenges.</p>
        )}
      </Card>

      <Card className="space-y-2">
        <h2 className="font-semibold">Score Trend</h2>
        <div className="grid grid-cols-7 gap-2 text-xs sm:grid-cols-10">
          {data?.series.map((point) => (
            <div key={point.date} className="rounded-md bg-secondary p-2 text-center">
              <p>{point.score}%</p>
              <p className="truncate">{point.date.slice(5)}</p>
            </div>
          ))}
        </div>
      </Card>

    </main>
  );
}

function formatProgress(progress: unknown): string {
  if (!progress || typeof progress !== "object") return "Not started";
  const record = progress as Record<string, unknown>;
  if (typeof record.percent === "number") {
    return `${Math.max(0, Math.min(100, Math.round(record.percent)))}%`;
  }
  if (typeof record.completed === "number" && typeof record.target === "number" && record.target > 0) {
    return `${record.completed}/${record.target}`;
  }
  return "In progress";
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-4 ${strong ? "font-semibold" : ""}`}>
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function StatTile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function formatShortDate(date: string) {
  const [, month, day] = date.split("-");
  if (!month || !day) return date;
  return `${day}-${month}`;
}
