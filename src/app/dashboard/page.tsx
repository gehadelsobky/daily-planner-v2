"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { apiFetch } from "@/lib/fetcher";

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

  const { data } = useQuery({
    queryKey: ["dashboard", range],
    queryFn: () => apiFetch<DashboardResponse>(`/api/dashboard?range=${range}`)
  });

  const levelProgress = data
    ? (data.gamification.currentLevelXp / data.gamification.nextLevelXp) * 100
    : 0;

  return (
    <main className="mx-auto max-w-5xl space-y-4 px-4 py-6">
      <Card className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <div className="flex gap-2">
          <Button variant={range === "week" ? "default" : "secondary"} onClick={() => setRange("week")}>
            Week
          </Button>
          <Button variant={range === "month" ? "default" : "secondary"} onClick={() => setRange("month")}>
            Month
          </Button>
        </div>
      </Card>

      <Card className="space-y-2">
        <h2 className="font-semibold">Average Score</h2>
        <p className="text-3xl font-bold">{data?.stats.avgScore ?? 0}%</p>
        <p className="text-sm text-muted-foreground">
          Best day: {data?.stats.bestDay.date} ({data?.stats.bestDay.score}%)
        </p>
      </Card>

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
