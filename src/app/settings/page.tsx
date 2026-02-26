"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/fetcher";

type HabitFrequency = "daily" | "weekdays" | "custom";
type WaterUnit = "cups" | "ml";

const WEEK_DAYS: Array<{ value: number; label: string }> = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" }
];

const scoreSchema = z.object({
  tasks: z.coerce.number().int(),
  grow: z.coerce.number().int(),
  habits: z.coerce.number().int(),
  exercise: z.coerce.number().int(),
  grateful: z.coerce.number().int(),
  water: z.coerce.number().int()
});

type ScoreFormValues = z.infer<typeof scoreSchema>;

type HabitItem = {
  id: string;
  name: string;
  frequency: HabitFrequency;
  targetValue: number | null;
  targetUnit: string | null;
  customDays: number[] | null;
  isActive: boolean;
};

type ProfileResponse = {
  profile: {
    name: string;
    timezone: string;
    weekStartDay: number;
    waterDefaultTarget: number | null;
    waterDefaultUnit: WaterUnit;
  };
};

export default function SettingsPage() {
  const form = useForm<ScoreFormValues>({ resolver: zodResolver(scoreSchema) });
  const queryClient = useQueryClient();

  const [weightsFeedback, setWeightsFeedback] = useState<string | null>(null);
  const [profileFeedback, setProfileFeedback] = useState<string | null>(null);

  const [profileName, setProfileName] = useState("");
  const [profileTimezone, setProfileTimezone] = useState("UTC");
  const [profileWeekStartDay, setProfileWeekStartDay] = useState(1);
  const [profileWaterTarget, setProfileWaterTarget] = useState<number | "">("");
  const [profileWaterUnit, setProfileWaterUnit] = useState<WaterUnit>("cups");

  const [habitName, setHabitName] = useState("");
  const [habitFrequency, setHabitFrequency] = useState<HabitFrequency>("daily");
  const [habitCustomDays, setHabitCustomDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [habitTargetValue, setHabitTargetValue] = useState<number | "">("");
  const [habitTargetUnit, setHabitTargetUnit] = useState("");
  const [habitEditTargets, setHabitEditTargets] = useState<Record<string, { value: number | ""; unit: string }>>({});
  const [habitEditCustomDays, setHabitEditCustomDays] = useState<Record<string, number[]>>({});

  const settings = useQuery({
    queryKey: ["score-settings"],
    queryFn: () => apiFetch<any>("/api/score-settings")
  });

  const habits = useQuery({
    queryKey: ["habits-settings-list"],
    queryFn: () => apiFetch<{ habits: HabitItem[] }>("/api/habits")
  });

  const profile = useQuery({
    queryKey: ["profile"],
    queryFn: () => apiFetch<ProfileResponse>("/api/profile")
  });

  useEffect(() => {
    if (!settings.data?.current) return;
    form.reset({
      tasks: settings.data.current.tasksWeight,
      grow: settings.data.current.growWeight,
      habits: settings.data.current.habitsWeight,
      exercise: settings.data.current.exerciseWeight,
      grateful: settings.data.current.gratefulWeight,
      water: settings.data.current.waterWeight
    });
  }, [settings.data, form]);

  useEffect(() => {
    if (!profile.data?.profile) return;
    setProfileName(profile.data.profile.name ?? "");
    setProfileTimezone(profile.data.profile.timezone ?? "UTC");
    setProfileWeekStartDay(profile.data.profile.weekStartDay ?? 1);
    setProfileWaterTarget(profile.data.profile.waterDefaultTarget ?? "");
    setProfileWaterUnit(profile.data.profile.waterDefaultUnit ?? "cups");
  }, [profile.data]);

  useEffect(() => {
    if (!habits.data?.habits?.length) return;

    const nextTargets: Record<string, { value: number | ""; unit: string }> = {};
    const nextCustomDays: Record<string, number[]> = {};

    for (const habit of habits.data.habits) {
      nextTargets[habit.id] = {
        value: habit.targetValue ?? "",
        unit: habit.targetUnit ?? ""
      };
      nextCustomDays[habit.id] = Array.isArray(habit.customDays) ? [...habit.customDays].sort((a, b) => a - b) : [];
    }

    setHabitEditTargets(nextTargets);
    setHabitEditCustomDays(nextCustomDays);
  }, [habits.data]);

  const saveWeights = useMutation({
    mutationFn: (values: ScoreFormValues) =>
      apiFetch("/api/score-settings/update", {
        method: "POST",
        body: JSON.stringify({
          effective_from: new Date().toISOString().slice(0, 10),
          weights: values
        })
      }),
    onSuccess: async () => {
      setWeightsFeedback("Score settings saved.");
      await queryClient.invalidateQueries({ queryKey: ["score-settings"] });
      await queryClient.invalidateQueries({ queryKey: ["daily"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => {
      setWeightsFeedback(error instanceof Error ? error.message : "Failed to save score settings.");
    }
  });

  const saveProfile = useMutation({
    mutationFn: () =>
      apiFetch("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({
          name: profileName,
          timezone: profileTimezone,
          week_start_day: profileWeekStartDay,
          water_default_target: profileWaterTarget === "" ? null : Number(profileWaterTarget),
          water_default_unit: profileWaterUnit
        })
      }),
    onSuccess: async () => {
      setProfileFeedback("Profile settings saved.");
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      await queryClient.invalidateQueries({ queryKey: ["daily"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => {
      setProfileFeedback(error instanceof Error ? error.message : "Failed to save profile settings.");
    }
  });

  const createHabit = useMutation({
    mutationFn: () =>
      apiFetch("/api/habits/create", {
        method: "POST",
        body: JSON.stringify({
          name: habitName,
          frequency: habitFrequency,
          custom_days: habitFrequency === "custom" ? habitCustomDays : null,
          target_value: habitTargetValue === "" ? inferTargetFromName(habitName).value : Number(habitTargetValue),
          target_unit: habitTargetUnit.trim() ? habitTargetUnit.trim() : inferTargetFromName(habitName).unit
        })
      }),
    onSuccess: async () => {
      setHabitName("");
      setHabitFrequency("daily");
      setHabitCustomDays([1, 2, 3, 4, 5]);
      setHabitTargetValue("");
      setHabitTargetUnit("");
      await queryClient.invalidateQueries({ queryKey: ["habits-settings-list"] });
      await queryClient.invalidateQueries({ queryKey: ["daily"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-habits"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    }
  });

  const updateHabit = useMutation({
    mutationFn: (payload: {
      habit_id: string;
      is_active?: boolean;
      frequency?: HabitFrequency;
      custom_days?: number[] | null;
      target_value?: number | null;
      target_unit?: string | null;
    }) =>
      apiFetch("/api/habits/update", {
        method: "PATCH",
        body: JSON.stringify(payload)
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["habits-settings-list"] });
      await queryClient.invalidateQueries({ queryKey: ["daily"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-habits"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    }
  });

  const activeCount = useMemo(
    () => habits.data?.habits.filter((habit) => habit.isActive).length ?? 0,
    [habits.data]
  );
  const timezoneOptions = useMemo(() => {
    const values =
      typeof Intl !== "undefined" && typeof Intl.supportedValuesOf === "function"
        ? (Intl.supportedValuesOf("timeZone") as string[])
        : ["UTC"];

    if (profileTimezone && !values.includes(profileTimezone)) {
      return [profileTimezone, ...values];
    }
    return values;
  }, [profileTimezone]);

  const canCreateHabit = habitName.trim().length > 0 && (habitFrequency !== "custom" || habitCustomDays.length > 0);

  return (
    <main className="mx-auto max-w-4xl space-y-4 px-4 py-6">
      <Card className="space-y-4">
        <h1 className="text-2xl font-semibold">Score Settings</h1>
        <p className="text-sm text-muted-foreground">
          Sum must be 100. NA components are re-normalized on each day automatically. Changes can be made once every 7 days.
        </p>
        <form
          className="grid grid-cols-2 gap-3"
          onSubmit={form.handleSubmit((values) => {
            setWeightsFeedback(null);
            saveWeights.mutate(values);
          })}
        >
          <label className="space-y-1 text-sm">Tasks <Input type="number" {...form.register("tasks")} /></label>
          <label className="space-y-1 text-sm">Grow <Input type="number" {...form.register("grow")} /></label>
          <label className="space-y-1 text-sm">Habits <Input type="number" {...form.register("habits")} /></label>
          <label className="space-y-1 text-sm">Exercise <Input type="number" {...form.register("exercise")} /></label>
          <label className="space-y-1 text-sm">Grateful <Input type="number" {...form.register("grateful")} /></label>
          <label className="space-y-1 text-sm">Water <Input type="number" {...form.register("water")} /></label>
          <Button type="submit" className="col-span-2" disabled={saveWeights.isPending}>
            Save weights
          </Button>
        </form>
        {weightsFeedback ? <p className="text-sm text-muted-foreground">{weightsFeedback}</p> : null}
      </Card>

      <Card className="space-y-4">
        <h2 className="text-xl font-semibold">Profile Settings</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            Name
            <Input value={profileName} onChange={(e) => setProfileName(e.target.value)} placeholder="Your name" />
          </label>
          <label className="space-y-1 text-sm">
            Timezone
            <select
              value={profileTimezone}
              onChange={(e) => setProfileTimezone(e.target.value)}
              className="h-10 w-full rounded-md border border-border bg-[hsl(var(--card))] px-3 py-2 text-sm"
            >
              {timezoneOptions.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            Week Start Day
            <select
              value={profileWeekStartDay}
              onChange={(e) => setProfileWeekStartDay(Number(e.target.value))}
              className="h-10 w-full rounded-md border border-border bg-[hsl(var(--card))] px-3 py-2 text-sm"
            >
              {WEEK_DAYS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            Water Default Target
            <Input
              type="number"
              value={profileWaterTarget}
              onChange={(e) => setProfileWaterTarget(e.target.value ? Number(e.target.value) : "")}
              placeholder="8"
            />
          </label>
          <label className="space-y-1 text-sm">
            Water Unit
            <select
              value={profileWaterUnit}
              onChange={(e) => setProfileWaterUnit(e.target.value as WaterUnit)}
              className="h-10 w-full rounded-md border border-border bg-[hsl(var(--card))] px-3 py-2 text-sm"
            >
              <option value="cups">cups</option>
              <option value="ml">ml</option>
            </select>
          </label>
        </div>
        <Button
          onClick={() => {
            setProfileFeedback(null);
            saveProfile.mutate();
          }}
          disabled={saveProfile.isPending}
        >
          Save profile
        </Button>
        {profileFeedback ? <p className="text-sm text-muted-foreground">{profileFeedback}</p> : null}
      </Card>

      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Habits List</h2>
          <p className="text-sm text-muted-foreground">Active habits: {activeCount}</p>
        </div>
        <p className="text-sm text-muted-foreground">
          Manage your habits here. Active habits appear in Habit Tracker on your Dashboard and Daily page.
        </p>

        <div className="grid gap-2 sm:grid-cols-4">
          <Input
            value={habitName}
            onChange={(e) => setHabitName(e.target.value)}
            placeholder="New habit name (e.g., Read 20 minutes)"
          />
          <select
            value={habitFrequency}
            onChange={(e) => {
              const nextFrequency = e.target.value as HabitFrequency;
              setHabitFrequency(nextFrequency);
              if (nextFrequency === "custom" && habitCustomDays.length === 0) {
                setHabitCustomDays([1, 2, 3, 4, 5]);
              }
            }}
            className="rounded-md border border-border bg-[hsl(var(--card))] px-3 py-2 text-sm"
          >
            <option value="daily">Daily</option>
            <option value="weekdays">Weekdays</option>
            <option value="custom">Custom</option>
          </select>
          <Input
            type="number"
            value={habitTargetValue}
            onChange={(e) => setHabitTargetValue(e.target.value ? Number(e.target.value) : "")}
            placeholder="Target (optional)"
          />
          <Input
            value={habitTargetUnit}
            onChange={(e) => setHabitTargetUnit(e.target.value)}
            placeholder="Unit (e.g., min)"
          />
          <Button
            onClick={() => {
              if (!canCreateHabit) return;
              createHabit.mutate();
            }}
            disabled={createHabit.isPending || !canCreateHabit}
          >
            Add Habit
          </Button>
        </div>

        {habitFrequency === "custom" ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Select custom days</p>
            <div className="flex flex-wrap gap-2">
              {WEEK_DAYS.map((day) => {
                const active = habitCustomDays.includes(day.value);
                return (
                  <Button
                    key={day.value}
                    type="button"
                    variant={active ? "default" : "secondary"}
                    onClick={() => setHabitCustomDays((prev) => toggleDay(prev, day.value))}
                    className="h-8 px-3 text-xs"
                  >
                    {day.label}
                  </Button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          {habits.data?.habits?.length ? (
            habits.data.habits.map((habit) => (
              <div
                key={habit.id}
                className="flex flex-col gap-2 rounded-md border border-border p-3"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{habit.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Frequency: {habit.frequency}
                      {habit.frequency === "custom"
                        ? ` (${formatDays(habitEditCustomDays[habit.id] ?? [] )})`
                        : ""}
                      {habit.targetValue ? ` • Target: ${habit.targetValue} ${habit.targetUnit ?? ""}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      type="number"
                      className="h-8 w-24"
                      value={habitEditTargets[habit.id]?.value ?? ""}
                      onChange={(e) =>
                        setHabitEditTargets((prev) => ({
                          ...prev,
                          [habit.id]: {
                            value: e.target.value ? Number(e.target.value) : "",
                            unit: prev[habit.id]?.unit ?? habit.targetUnit ?? ""
                          }
                        }))
                      }
                      placeholder="Target"
                    />
                    <Input
                      className="h-8 w-24"
                      value={habitEditTargets[habit.id]?.unit ?? ""}
                      onChange={(e) =>
                        setHabitEditTargets((prev) => ({
                          ...prev,
                          [habit.id]: {
                            value: prev[habit.id]?.value ?? habit.targetValue ?? "",
                            unit: e.target.value
                          }
                        }))
                      }
                      placeholder="Unit"
                    />
                    <Button
                      variant="secondary"
                      onClick={() =>
                        updateHabit.mutate({
                          habit_id: habit.id,
                          target_value:
                            habitEditTargets[habit.id]?.value === ""
                              ? null
                              : Number(habitEditTargets[habit.id]?.value),
                          target_unit: (habitEditTargets[habit.id]?.unit ?? "").trim() || null
                        })
                      }
                    >
                      Save target
                    </Button>
                    <select
                      value={habit.frequency}
                      onChange={(e) => {
                        const nextFrequency = e.target.value as HabitFrequency;
                        const customDays =
                          nextFrequency === "custom"
                            ? (habitEditCustomDays[habit.id]?.length
                              ? habitEditCustomDays[habit.id]
                              : [1, 2, 3, 4, 5])
                            : null;
                        setHabitEditCustomDays((prev) => ({
                          ...prev,
                          [habit.id]: customDays ?? (prev[habit.id] ?? [])
                        }));
                        updateHabit.mutate({
                          habit_id: habit.id,
                          frequency: nextFrequency,
                          custom_days: customDays
                        });
                      }}
                      className="rounded-md border border-border bg-[hsl(var(--card))] px-2 py-1 text-xs"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekdays">Weekdays</option>
                      <option value="custom">Custom</option>
                    </select>
                    <Button
                      variant={habit.isActive ? "secondary" : "default"}
                      onClick={() =>
                        updateHabit.mutate({
                          habit_id: habit.id,
                          is_active: !habit.isActive
                        })
                      }
                    >
                      {habit.isActive ? "Disable" : "Enable"}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() =>
                        updateHabit.mutate({
                          habit_id: habit.id,
                          target_value: habit.targetValue ? null : 1,
                          target_unit: habit.targetValue ? null : "count"
                        })
                      }
                    >
                      {habit.targetValue ? "Make Binary" : "Make Measurable"}
                    </Button>
                  </div>
                </div>

                {habit.frequency === "custom" ? (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Custom days</p>
                    <div className="flex flex-wrap gap-2">
                      {WEEK_DAYS.map((day) => {
                        const active = (habitEditCustomDays[habit.id] ?? []).includes(day.value);
                        return (
                          <Button
                            key={`${habit.id}-${day.value}`}
                            type="button"
                            variant={active ? "default" : "secondary"}
                            onClick={() =>
                              setHabitEditCustomDays((prev) => ({
                                ...prev,
                                [habit.id]: toggleDay(prev[habit.id] ?? [], day.value)
                              }))
                            }
                            className="h-8 px-3 text-xs"
                          >
                            {day.label}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() =>
                        updateHabit.mutate({
                          habit_id: habit.id,
                          custom_days: habitEditCustomDays[habit.id] ?? []
                        })
                      }
                    >
                      Save days
                    </Button>
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No habits yet. Add your first habit above.</p>
          )}
        </div>
      </Card>
    </main>
  );
}

function inferTargetFromName(name: string): { value: number | null; unit: string | null } {
  const matched = name.match(/(\d+)\s*(min|mins|minute|minutes|hour|hours|cup|cups|ml|km|step|steps|page|pages)\b/i);
  if (!matched) return { value: null, unit: null };

  const value = Number(matched[1]);
  if (!Number.isFinite(value) || value <= 0) return { value: null, unit: null };

  const rawUnit = matched[2].toLowerCase();
  const unit = rawUnit === "mins" ? "min" : rawUnit;
  return { value, unit };
}

function toggleDay(days: number[], day: number): number[] {
  const next = new Set(days);
  if (next.has(day)) {
    next.delete(day);
  } else {
    next.add(day);
  }
  return Array.from(next).sort((a, b) => a - b);
}

function formatDays(days: number[]): string {
  if (!days.length) return "none";
  const labels = WEEK_DAYS.filter((d) => days.includes(d.value)).map((d) => d.label);
  return labels.join(", ");
}
