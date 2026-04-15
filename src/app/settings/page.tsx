"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CountryCodeSelect } from "@/components/ui/country-code-select";
import { apiFetch } from "@/lib/fetcher";
import { DEFAULT_PHONE_COUNTRY, getPhoneCountryOption } from "@/lib/phone";

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
    email: string;
    phoneCountry: string | null;
    phoneNumber: string | null;
    phoneE164: string | null;
    avatarUrl: string | null;
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
  const [profileEmail, setProfileEmail] = useState("");
  const [profilePhoneCountry, setProfilePhoneCountry] = useState<string>(DEFAULT_PHONE_COUNTRY);
  const [profilePhoneNumber, setProfilePhoneNumber] = useState("");
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
    setProfileEmail(profile.data.profile.email ?? "");
    setProfilePhoneCountry(profile.data.profile.phoneCountry ?? DEFAULT_PHONE_COUNTRY);
    setProfilePhoneNumber(profile.data.profile.phoneNumber ?? "");
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
          phone_country: profilePhoneCountry,
          phone_number: profilePhoneNumber,
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
  const watchedWeights = form.watch(["tasks", "grow", "habits", "exercise", "grateful", "water"]);
  const totalWeights = useMemo(() => {
    return watchedWeights.reduce((sum, value) => sum + (Number(value) || 0), 0);
  }, [watchedWeights]);
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
  const selectedProfileCountry = getPhoneCountryOption(profilePhoneCountry);

  return (
    <main className="mx-auto max-w-4xl space-y-4 px-4 py-6">
      <Card className="overflow-hidden">
        <div className="grid gap-5 lg:grid-cols-[1.2fr,0.8fr]">
          <div className="space-y-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Workspace Setup</p>
              <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
            </div>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Configure how your planner behaves, how your score is calculated, and which habits appear in your daily system.
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge>{activeCount} active habits</Badge>
              <Badge>{profileWaterUnit} water tracking</Badge>
              <Badge>{totalWeights}% total score weight</Badge>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-white/85 px-4 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Profile</p>
              <p className="mt-1 text-sm font-medium">{profileName || "Your account"}</p>
              <p className="mt-1 text-xs text-muted-foreground">{profileEmail || profileTimezone}</p>
            </div>
            <div className="rounded-2xl border border-border bg-white/85 px-4 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Phone</p>
              <p className="mt-1 text-sm font-medium">
                {profilePhoneNumber ? `${selectedProfileCountry.flag} ${selectedProfileCountry.dialCode} ${profilePhoneNumber}` : "Add your phone number"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Stored with country code for future verification and reminders.</p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="space-y-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Scoring</p>
              <h2 className="text-2xl font-semibold">Score Settings</h2>
            </div>
            <Badge>{totalWeights}% total</Badge>
          </div>
        </div>
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
          <label className="space-y-1 text-sm">
            <span>Tasks</span>
            <div className="relative">
              <Input type="number" className="pr-10" {...form.register("tasks")} />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
            </div>
          </label>
          <label className="space-y-1 text-sm">
            <span>Grow</span>
            <div className="relative">
              <Input type="number" className="pr-10" {...form.register("grow")} />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
            </div>
          </label>
          <label className="space-y-1 text-sm">
            <span>Habits</span>
            <div className="relative">
              <Input type="number" className="pr-10" {...form.register("habits")} />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
            </div>
          </label>
          <label className="space-y-1 text-sm">
            <span>Exercise</span>
            <div className="relative">
              <Input type="number" className="pr-10" {...form.register("exercise")} />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
            </div>
          </label>
          <label className="space-y-1 text-sm">
            <span>Grateful</span>
            <div className="relative">
              <Input type="number" className="pr-10" {...form.register("grateful")} />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
            </div>
          </label>
          <label className="space-y-1 text-sm">
            <span>Water</span>
            <div className="relative">
              <Input type="number" className="pr-10" {...form.register("water")} />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
            </div>
          </label>
          <Button type="submit" className="col-span-2" disabled={saveWeights.isPending}>
            {saveWeights.isPending ? "Saving weights..." : "Save weights"}
          </Button>
        </form>
        {weightsFeedback ? (
          <div className="rounded-2xl border border-border bg-white/80 px-4 py-3 text-sm text-muted-foreground">
            {weightsFeedback}
          </div>
        ) : null}
      </Card>

      <Card className="space-y-4">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Identity & defaults</p>
          <h2 className="text-2xl font-semibold">Profile Settings</h2>
          <p className="text-sm text-muted-foreground">
            These settings affect how dates, hydration, and your planning defaults behave across the app.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            Name
            <Input value={profileName} onChange={(e) => setProfileName(e.target.value)} placeholder="Your name" />
          </label>
          <label className="space-y-1 text-sm">
            Email
            <Input value={profileEmail} disabled className="cursor-not-allowed opacity-70" />
          </label>
          <label className="space-y-1 text-sm">
            Country code
            <CountryCodeSelect value={profilePhoneCountry} onChange={setProfilePhoneCountry} />
          </label>
          <label className="space-y-1 text-sm">
            Phone number
            <Input
              value={profilePhoneNumber}
              onChange={(e) => setProfilePhoneNumber(e.target.value)}
              placeholder={`Number without ${selectedProfileCountry.dialCode}`}
              autoComplete="tel-national"
              inputMode="tel"
            />
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
          {saveProfile.isPending ? "Saving profile..." : "Save profile"}
        </Button>
        {profileFeedback ? (
          <div className="rounded-2xl border border-border bg-white/80 px-4 py-3 text-sm text-muted-foreground">
            {profileFeedback}
          </div>
        ) : null}
      </Card>

      <Card className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Habit system</p>
            <h2 className="text-2xl font-semibold">Habits List</h2>
          </div>
          <Badge>Active habits: {activeCount}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Manage your habits here. Active habits appear in Habit Tracker on your Dashboard and Daily page.
        </p>

        <div className="rounded-[1.25rem] border border-border bg-white/70 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
          <div className="mb-4">
            <h3 className="font-semibold">Create a new habit</h3>
            <p className="text-sm text-muted-foreground">
              Add measurable habits when progress matters, or keep them binary for a simple done/not done flow.
            </p>
          </div>
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
              className="rounded-xl border border-border bg-[hsl(var(--card))] px-3 py-2 text-sm"
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
              {createHabit.isPending ? "Adding..." : "Add Habit"}
            </Button>
          </div>
        </div>

        {habitFrequency === "custom" ? (
          <div className="space-y-2 rounded-[1.25rem] border border-border bg-white/70 p-4">
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
                className="flex flex-col gap-3 rounded-[1.25rem] border border-border bg-white/75 p-4 shadow-[0_8px_22px_rgba(15,23,42,0.04)]"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{habit.name}</p>
                      <Badge className={habit.isActive ? "" : "bg-[#9E9E9E] text-white shadow-none"}>
                        {habit.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
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
                      className="rounded-xl border border-border bg-[hsl(var(--card))] px-2 py-1 text-xs"
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
