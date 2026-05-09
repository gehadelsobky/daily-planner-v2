"use client";

import Link from "next/link";
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
    lifecycle: {
      accountStatus: string;
      emailVerifiedAt: string | null;
      lastLoginAt: string | null;
      lastActiveAt: string | null;
      onboardingState: string;
      onboardingCompletedAt: string | null;
      onboardingProgressPercent: number;
      nextRecommendedStep: string;
    };
  };
  workspace: {
    id: string;
    name: string;
    type: string;
    status: string;
    membershipRole: string;
    membershipStatus: string;
    planCode: string;
    billingStatus: string;
    entitlements: {
      maxHabits: number | "unlimited";
      analyticsWindowDays: number;
      canUseAdvancedAnalytics: boolean;
      canUseEmailReminders: boolean;
      canExportData: boolean;
      canUseMonthlyReview: boolean;
      canUseTeamFeatures: boolean;
    };
    usage: {
      habitsCount: number;
      teamMembersCount: number;
      periodKey: string;
    };
    lockedFeatures: Array<{
      code: string;
      title: string;
      description: string;
      availableOn: string;
      enabled: boolean;
    }>;
  };
};

type WorkspaceMembersResponse = {
  workspace: {
    id: string;
    name: string;
    planCode: string;
    type: string;
  };
  capabilities: {
    canInviteMembers: boolean;
    canManageRoles: boolean;
    maxMembers: number;
    currentMembers: number;
    nextUnlockPlan: string;
  };
  members: Array<{
    id: string;
    userId: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    role: string;
    status: string;
    joinedAt: string;
    isCurrentUser: boolean;
  }>;
};

export default function SettingsPage() {
  const form = useForm<ScoreFormValues>({ resolver: zodResolver(scoreSchema) });
  const queryClient = useQueryClient();

  const [weightsFeedback, setWeightsFeedback] = useState<string | null>(null);
  const [profileFeedback, setProfileFeedback] = useState<string | null>(null);
  const [workspaceFeedback, setWorkspaceFeedback] = useState<string | null>(null);

  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profilePhoneCountry, setProfilePhoneCountry] = useState<string>(DEFAULT_PHONE_COUNTRY);
  const [profilePhoneNumber, setProfilePhoneNumber] = useState("");
  const [profileTimezone, setProfileTimezone] = useState("UTC");
  const [profileWeekStartDay, setProfileWeekStartDay] = useState(1);
  const [profileWaterTarget, setProfileWaterTarget] = useState<number | "">("");
  const [profileWaterUnit, setProfileWaterUnit] = useState<WaterUnit>("cups");
  const [workspaceNameDraft, setWorkspaceNameDraft] = useState("");

  const [habitName, setHabitName] = useState("");
  const [habitFrequency, setHabitFrequency] = useState<HabitFrequency>("daily");
  const [habitCustomDays, setHabitCustomDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [habitTargetValue, setHabitTargetValue] = useState<number | "">("");
  const [habitTargetUnit, setHabitTargetUnit] = useState("");
  const [habitEditNames, setHabitEditNames] = useState<Record<string, string>>({});
  const [habitEditTargets, setHabitEditTargets] = useState<Record<string, { value: number | ""; unit: string }>>({});
  const [habitEditCustomDays, setHabitEditCustomDays] = useState<Record<string, number[]>>({});
  const [habitEditingId, setHabitEditingId] = useState<string | null>(null);
  const [habitDeleteConfirmId, setHabitDeleteConfirmId] = useState<string | null>(null);

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

  const workspaceMembers = useQuery({
    queryKey: ["workspace-members"],
    queryFn: () => apiFetch<WorkspaceMembersResponse>("/api/workspace/members")
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
    if (!profile.data?.workspace?.name) return;
    setWorkspaceNameDraft(profile.data.workspace.name);
  }, [profile.data?.workspace?.name]);

  useEffect(() => {
    if (!habits.data?.habits?.length) return;

    const nextTargets: Record<string, { value: number | ""; unit: string }> = {};
    const nextCustomDays: Record<string, number[]> = {};
    const nextNames: Record<string, string> = {};

    for (const habit of habits.data.habits) {
      nextNames[habit.id] = habit.name;
      nextTargets[habit.id] = {
        value: habit.targetValue ?? "",
        unit: habit.targetUnit ?? ""
      };
      nextCustomDays[habit.id] = Array.isArray(habit.customDays) ? [...habit.customDays].sort((a, b) => a - b) : [];
    }

    setHabitEditNames(nextNames);
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

  const saveWorkspace = useMutation({
    mutationFn: () =>
      apiFetch("/api/workspace", {
        method: "PATCH",
        body: JSON.stringify({
          name: workspaceNameDraft
        })
      }),
    onSuccess: async () => {
      setWorkspaceFeedback("Workspace name saved.");
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      await queryClient.invalidateQueries({ queryKey: ["workspace-profile-summary"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard", "week"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard", "month"] });
    },
    onError: (error) => {
      setWorkspaceFeedback(error instanceof Error ? error.message : "Failed to save workspace name.");
    }
  });

  const updateHabit = useMutation({
    mutationFn: (payload: {
      habit_id: string;
      name?: string;
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

  const deleteHabit = useMutation({
    mutationFn: (habitId: string) =>
      apiFetch("/api/habits/delete", {
        method: "DELETE",
        body: JSON.stringify({ habit_id: habitId })
      }),
    onSuccess: async () => {
      setHabitDeleteConfirmId(null);
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
  const workspacePlan = profile.data?.workspace?.planCode?.toUpperCase() ?? "FREE";
  const workspaceUsage = profile.data?.workspace?.usage;
  const workspaceEntitlements = profile.data?.workspace?.entitlements;
  const workspaceName = profile.data?.workspace?.name ?? "Personal workspace";
  const workspaceTypeLabel = profile.data?.workspace?.type
    ? `${profile.data.workspace.type.charAt(0).toUpperCase()}${profile.data.workspace.type.slice(1)}`
    : "Personal";
  const workspaceStatusLabel = profile.data?.workspace?.status
    ? profile.data.workspace.status.replaceAll("_", " ")
    : "active";
  const membershipRoleLabel = profile.data?.workspace?.membershipRole
    ? profile.data.workspace.membershipRole.replaceAll("_", " ")
    : "owner";
  const lockedFeatures = profile.data?.workspace?.lockedFeatures ?? [];
  const habitLimitLabel = workspaceEntitlements
    ? workspaceEntitlements.maxHabits === "unlimited"
      ? `${workspaceUsage?.habitsCount ?? 0} habits in use`
      : `${workspaceUsage?.habitsCount ?? 0}/${workspaceEntitlements.maxHabits} habits used`
    : `${activeCount} active habits`;
  const selectedProfileCountry = getPhoneCountryOption(profilePhoneCountry);
  const profileInitials = (profileName || "Your Account")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  const phoneDisplay = profilePhoneNumber
    ? `${selectedProfileCountry.flag} ${selectedProfileCountry.dialCode} ${profilePhoneNumber}`
    : "No phone added yet";
  const lifecycle = profile.data?.profile.lifecycle;
  const workspaceMembersData = workspaceMembers.data?.members ?? [];
  const workspaceCapabilities = workspaceMembers.data?.capabilities;
  const teamLockedFeature = lockedFeatures.find((feature) => feature.code === "team_workspaces");
  const teamInterestHref = useMemo(() => {
    const subject = encodeURIComponent(`Daily Planner Team interest - ${workspaceName}`);
    const body = encodeURIComponent(
      [
        `Workspace: ${workspaceName}`,
        `Plan: ${workspacePlan}`,
        `Current members: ${workspaceCapabilities?.currentMembers ?? workspaceUsage?.teamMembersCount ?? 1}`,
        "",
        "We want to use Daily Planner as a team workspace.",
        "Please contact us with the next step for Team access."
      ].join("\n")
    );

    return `mailto:hello@gehadelsobky.com?subject=${subject}&body=${body}`;
  }, [workspaceCapabilities?.currentMembers, workspaceName, workspacePlan, workspaceUsage?.teamMembersCount]);
  const onboardingStateLabel = lifecycle?.onboardingState
    ?.replaceAll("_", " ")
    ?.replace(/\b\w/g, (char) => char.toUpperCase());

  const saveHabitName = (habitId: string) => {
    const nextName = (habitEditNames[habitId] ?? "").trim();
    if (!nextName) return;

    updateHabit.mutate(
      {
        habit_id: habitId,
        name: nextName
      },
      {
        onSuccess: () => {
          setHabitEditingId(null);
        }
      }
    );
  };

  return (
    <main className="mx-auto max-w-[1280px] space-y-5 px-4 py-6">
      <Card className="overflow-hidden">
        <div className="space-y-6">
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Workspace Setup</p>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Settings</h1>
            </div>
            <p className="max-w-2xl text-base leading-8 text-muted-foreground">
              Configure how your planner behaves, how your score is calculated, and which habits appear in your daily system.
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge>{workspacePlan} plan</Badge>
              <Badge>{habitLimitLabel}</Badge>
              <Badge>{profileWaterUnit} water tracking</Badge>
              <Badge>{totalWeights}% total score weight</Badge>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,250,255,0.92))] p-5 shadow-[0_14px_36px_rgba(15,23,42,0.06)]">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr),minmax(0,1.4fr)] lg:items-start">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#1745C7,#00b0ff)] text-lg font-semibold text-white shadow-[0_10px_24px_rgba(23,69,199,0.22)]">
                  {profileInitials || "DP"}
                </div>
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Account Snapshot</p>
                  <p className="mt-1 text-xl font-semibold text-[hsl(var(--foreground))]">
                    {profileName || "Your account"}
                  </p>
                  <p className="mt-1 truncate text-sm text-muted-foreground" title={profileEmail || ""}>
                    {profileEmail || "No email available"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge className="bg-white/85 text-foreground shadow-none">
                      {selectedProfileCountry.flag} {selectedProfileCountry.dialCode}
                    </Badge>
                    <Badge className="bg-white/85 text-foreground shadow-none">{profileTimezone}</Badge>
                    <Badge className="bg-white/85 text-foreground shadow-none">
                      Starts {WEEK_DAYS.find((day) => day.value === profileWeekStartDay)?.label ?? "Mon"}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-2xl border border-border/80 bg-white/88 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Phone</p>
                  <p className="mt-1 text-base font-semibold text-[hsl(var(--foreground))]">{phoneDisplay}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Stored with country code for reminders and account verification.
                  </p>
                </div>

                <div className="rounded-2xl border border-border/80 bg-white/88 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Country</p>
                  <p className="mt-1 text-base font-semibold text-[hsl(var(--foreground))]">
                    {selectedProfileCountry.flag} {selectedProfileCountry.name}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">Dial code {selectedProfileCountry.dialCode}</p>
                </div>

                <div className="rounded-2xl border border-border/80 bg-white/88 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Plan</p>
                  <p className="mt-1 text-base font-semibold text-[hsl(var(--foreground))]">{workspacePlan}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{habitLimitLabel}. Analytics window {workspaceEntitlements?.analyticsWindowDays ?? 90} days.</p>
                </div>

                <div className="rounded-2xl border border-border/80 bg-white/88 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Workspace</p>
                  <p className="mt-1 text-base font-semibold text-[hsl(var(--foreground))]">{workspaceName}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {workspaceTypeLabel} workspace • {workspaceStatusLabel}
                  </p>
                </div>

                <div className="rounded-2xl border border-border/80 bg-white/88 px-4 py-3 sm:col-span-2 xl:col-span-1">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Planner Defaults</p>
                  <div className="mt-2 space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Week start</span>
                      <span className="font-medium">
                        {WEEK_DAYS.find((day) => day.value === profileWeekStartDay)?.label ?? "Mon"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Water</span>
                      <span className="font-medium">
                        {profileWaterTarget === "" ? "Not set" : `${profileWaterTarget} ${profileWaterUnit}`}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-border/80 bg-white/88 px-4 py-3 sm:col-span-2 xl:col-span-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Onboarding & lifecycle</p>
                      <p className="mt-1 text-base font-semibold text-[hsl(var(--foreground))]">
                        {onboardingStateLabel ?? "Not Started"}
                      </p>
                    </div>
                    <Badge className="bg-white/85 text-foreground shadow-none">
                      {lifecycle?.onboardingProgressPercent ?? 0}% ready
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {lifecycle?.nextRecommendedStep ?? "Keep shaping your planner defaults and first routines."}
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-border/80 px-3 py-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Account status</p>
                      <p className="mt-1 text-sm font-medium">{lifecycle?.accountStatus ?? "active"}</p>
                    </div>
                    <div className="rounded-xl border border-border/80 px-3 py-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Last login</p>
                      <p className="mt-1 text-sm font-medium">{lifecycle?.lastLoginAt ? new Date(lifecycle.lastLoginAt).toLocaleDateString() : "Not recorded yet"}</p>
                    </div>
                    <div className="rounded-xl border border-border/80 px-3 py-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Last activity</p>
                      <p className="mt-1 text-sm font-medium">{lifecycle?.lastActiveAt ? new Date(lifecycle.lastActiveAt).toLocaleDateString() : "Not recorded yet"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="space-y-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Workspace control</p>
              <h2 className="text-2xl font-semibold">Workspace Settings</h2>
            </div>
            <Badge>{workspacePlan} plan</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Your planner now runs inside a workspace. Team collaboration is not enabled yet, but this structure is ready for the next SaaS layer.
          </p>
        </div>
        <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[1.5rem] border border-border bg-white/80 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Current workspace</p>
                <h3 className="mt-2 text-xl font-semibold text-[hsl(var(--foreground))]">{workspaceName}</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-[rgba(31,217,181,0.14)] text-[#0a0087] shadow-none">{workspaceTypeLabel}</Badge>
                <Badge className="bg-white text-[hsl(var(--foreground))] shadow-none">{workspaceStatusLabel}</Badge>
              </div>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">Workspace name</span>
                <Input
                  value={workspaceNameDraft}
                  onChange={(e) => setWorkspaceNameDraft(e.target.value)}
                  placeholder="Workspace name"
                />
              </label>
              <div className="flex items-end">
                <Button
                  onClick={() => {
                    setWorkspaceFeedback(null);
                    saveWorkspace.mutate();
                  }}
                  disabled={saveWorkspace.isPending || workspaceNameDraft.trim().length < 2}
                >
                  {saveWorkspace.isPending ? "Saving..." : "Save workspace"}
                </Button>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-border/80 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Role</p>
                <p className="mt-1 text-sm font-semibold capitalize">{membershipRoleLabel}</p>
              </div>
              <div className="rounded-2xl border border-border/80 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Members</p>
                <p className="mt-1 text-sm font-semibold">{workspaceUsage?.teamMembersCount ?? 1}</p>
              </div>
              <div className="rounded-2xl border border-border/80 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Habits in use</p>
                <p className="mt-1 text-sm font-semibold">{habitLimitLabel}</p>
              </div>
              <div className="rounded-2xl border border-border/80 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Analytics window</p>
                <p className="mt-1 text-sm font-semibold">{workspaceEntitlements?.analyticsWindowDays ?? 90} days</p>
              </div>
            </div>
            {workspaceFeedback ? (
              <div className="mt-4 rounded-2xl border border-border bg-white/80 px-4 py-3 text-sm text-muted-foreground">
                {workspaceFeedback}
              </div>
            ) : null}
          </div>

          <div className="rounded-[1.5rem] border border-border bg-[linear-gradient(180deg,rgba(248,251,255,0.95),rgba(255,255,255,0.92))] p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Team readiness</p>
            <h3 className="mt-2 text-xl font-semibold text-[hsl(var(--foreground))]">Members & collaboration</h3>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              This workspace is already modeled for team collaboration. Once the Team plan is enabled, invites, member roles, and shared reporting will appear here.
            </p>
            <div className="mt-5 space-y-3">
              <div className="rounded-2xl border border-border/80 bg-white/85 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Current state</p>
                <p className="mt-1 text-sm font-semibold">Single-owner personal workspace</p>
              </div>
              <div className="rounded-2xl border border-border/80 bg-white/85 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Next unlock</p>
                <p className="mt-1 text-sm font-semibold">Invites, member roles, and workspace collaboration</p>
              </div>
            </div>
          </div>
        </div>
        <div className="rounded-[1.5rem] border border-border bg-white/80 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Members</p>
              <h3 className="mt-2 text-xl font-semibold text-[hsl(var(--foreground))]">Workspace members</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Today this workspace is personal, but this section is now ready to grow into team access, invites, and role-based collaboration.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-white text-[hsl(var(--foreground))] shadow-none">
                {workspaceCapabilities?.currentMembers ?? workspaceUsage?.teamMembersCount ?? 1} member
                {(workspaceCapabilities?.currentMembers ?? workspaceUsage?.teamMembersCount ?? 1) === 1 ? "" : "s"}
              </Badge>
              <Badge>{workspacePlan} plan</Badge>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {workspaceMembersData.map((member) => {
              const initials = member.name
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0]?.toUpperCase())
                .join("");

              return (
                <div
                  key={member.id}
                  className="flex flex-col gap-4 rounded-[1.35rem] border border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(246,250,255,0.92))] px-4 py-4 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#1745C7,#00b0ff)] text-sm font-semibold text-white shadow-[0_10px_24px_rgba(23,69,199,0.18)]">
                      {initials || "DP"}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-semibold text-[hsl(var(--foreground))]">{member.name}</p>
                        {member.isCurrentUser ? (
                          <Badge className="bg-[rgba(31,217,181,0.14)] text-[#0a0087] shadow-none">You</Badge>
                        ) : null}
                        <Badge className="bg-white text-[hsl(var(--foreground))] shadow-none capitalize">
                          {member.role.replaceAll("_", " ")}
                        </Badge>
                        <Badge className="bg-white text-muted-foreground shadow-none capitalize">
                          {member.status.replaceAll("_", " ")}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{member.email}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Joined {new Date(member.joinedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" disabled className="opacity-100">
                      Role editing on Team
                    </Button>
                    <Button variant="secondary" disabled className="opacity-100">
                      Member actions on Team
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 grid gap-3 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[1.35rem] border border-border/80 bg-[rgba(248,251,255,0.82)] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Role model</p>
              <h4 className="mt-2 text-lg font-semibold text-[hsl(var(--foreground))]">How team permissions will work</h4>
              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                <div className="rounded-2xl border border-border/80 bg-white/90 px-4 py-3">
                  <p className="font-semibold text-[hsl(var(--foreground))]">Owner</p>
                  <p className="mt-1">Controls billing, members, workspace setup, and future upgrade decisions.</p>
                </div>
                <div className="rounded-2xl border border-border/80 bg-white/90 px-4 py-3">
                  <p className="font-semibold text-[hsl(var(--foreground))]">Admin</p>
                  <p className="mt-1">Helps manage members, habits, and shared planning rules without owning billing.</p>
                </div>
                <div className="rounded-2xl border border-border/80 bg-white/90 px-4 py-3">
                  <p className="font-semibold text-[hsl(var(--foreground))]">Member</p>
                  <p className="mt-1">Participates in the shared workspace and follows the collaboration flow set by the team.</p>
                </div>
              </div>
            </div>

            <div className="rounded-[1.35rem] border border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,250,255,0.94))] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Team unlock</p>
                  <h4 className="mt-2 text-lg font-semibold text-[hsl(var(--foreground))]">What becomes available on Team</h4>
                </div>
                <Badge className="bg-[rgba(0,176,255,0.14)] text-[#1745C7] shadow-none">Next plan: TEAM</Badge>
              </div>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                {teamLockedFeature?.description ??
                  "Invite members, assign roles, and work together inside one shared workspace."}
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border/80 bg-white/90 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Seats</p>
                  <p className="mt-1 text-sm font-semibold">
                    Up to {workspaceCapabilities?.maxMembers ?? 10} members per workspace
                  </p>
                </div>
                <div className="rounded-2xl border border-border/80 bg-white/90 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Collaboration</p>
                  <p className="mt-1 text-sm font-semibold">Invites, shared visibility, and role-based access</p>
                </div>
                <div className="rounded-2xl border border-border/80 bg-white/90 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Reporting</p>
                  <p className="mt-1 text-sm font-semibold">Shared accountability and workspace-level reporting</p>
                </div>
                <div className="rounded-2xl border border-border/80 bg-white/90 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Activation path</p>
                  <p className="mt-1 text-sm font-semibold">Upgrade to Team when you are ready to invite collaborators</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="rounded-2xl border border-dashed border-border px-4 py-4 text-sm text-muted-foreground">
              Team invitations are not active on the {workspacePlan} plan yet. When Team is enabled, you will be able to invite members, assign roles, and share planning workflows from here.
            </div>
            <div className="flex flex-wrap gap-2">
              <Button disabled className="opacity-100">
                Invite members on {workspaceCapabilities?.nextUnlockPlan?.toUpperCase() ?? "TEAM"}
              </Button>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded-full border border-[hsl(var(--border))] bg-white px-4 py-2 text-sm font-medium text-[hsl(var(--foreground))] transition hover:border-[#00b0ff] hover:text-[#1745C7]"
              >
                See Team plan
              </Link>
            </div>
          </div>

          <div className="mt-5 rounded-[1.5rem] border border-[rgba(0,176,255,0.22)] bg-[linear-gradient(135deg,rgba(23,69,199,0.06),rgba(0,176,255,0.08))] p-5">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Team interest</p>
                <h4 className="mt-2 text-xl font-semibold text-[hsl(var(--foreground))]">
                  Capture your collaboration intent before invites go live
                </h4>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  If you already know this workspace will need collaborators, send a Team interest request now. We will
                  know your workspace name, current seat count, and which next commercial layer matters most for you.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/80 bg-white/90 px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Best for</p>
                    <p className="mt-1 text-sm font-semibold">Shared planning teams</p>
                  </div>
                  <div className="rounded-2xl border border-white/80 bg-white/90 px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Signal</p>
                    <p className="mt-1 text-sm font-semibold">Invite need + role management</p>
                  </div>
                  <div className="rounded-2xl border border-white/80 bg-white/90 px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Current state</p>
                    <p className="mt-1 text-sm font-semibold">
                      {workspaceCapabilities?.currentMembers ?? workspaceUsage?.teamMembersCount ?? 1} seat ready
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 lg:min-w-[260px]">
                <Link
                  href={teamInterestHref}
                  className="inline-flex items-center justify-center rounded-full bg-[#1745C7] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_38px_rgba(23,69,199,0.22)] transition hover:bg-[#0a0087]"
                >
                  Request Team access
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center rounded-full border border-[hsl(var(--border))] bg-white px-5 py-3 text-sm font-semibold text-[hsl(var(--foreground))] transition hover:border-[#00b0ff] hover:text-[#1745C7]"
                >
                  Compare Free, Pro, and Team
                </Link>
                <p className="text-center text-xs text-muted-foreground">
                  This is a waitlist-style signal, not a billing step.
                </p>
              </div>
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

      {lockedFeatures.length ? (
        <Card className="space-y-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Plan boundaries</p>
                <h2 className="text-2xl font-semibold">What unlocks next</h2>
              </div>
              <Badge>{workspacePlan} plan</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Your current plan keeps the core planner open. These capabilities are already mapped in the SaaS layer and will unlock as the product expands.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {lockedFeatures.map((feature) => (
              <div key={feature.code} className="rounded-2xl border border-border bg-white/85 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-[hsl(var(--foreground))]">{feature.title}</p>
                  <Badge className="bg-[rgba(23,69,199,0.08)] text-[#1745C7] shadow-none">
                    {feature.availableOn.toUpperCase()}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <Card id="profile-settings" className="space-y-4">
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
              className="h-11 w-full rounded-xl border border-border bg-[rgba(255,255,255,0.94)] px-4 py-2 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
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
              className="h-11 w-full rounded-xl border border-border bg-[rgba(255,255,255,0.94)] px-4 py-2 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
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
              className="h-11 w-full rounded-xl border border-border bg-[rgba(255,255,255,0.94)] px-4 py-2 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
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

      <Card id="habits-list" className="space-y-4">
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
              className="rounded-xl border border-border bg-[rgba(255,255,255,0.94)] px-3 py-2 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
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
                      {habitEditingId === habit.id ? (
                        <>
                          <Input
                            className="h-9 min-w-[220px] sm:w-[260px]"
                            value={habitEditNames[habit.id] ?? ""}
                            onChange={(e) =>
                              setHabitEditNames((prev) => ({
                                ...prev,
                                [habit.id]: e.target.value
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                saveHabitName(habit.id);
                              }
                              if (e.key === "Escape") {
                                setHabitEditNames((prev) => ({
                                  ...prev,
                                  [habit.id]: habit.name
                                }));
                                setHabitEditingId(null);
                              }
                            }}
                            placeholder="Habit name"
                          />
                          <Button
                            variant="secondary"
                            className="h-9 px-3"
                            onClick={() => saveHabitName(habit.id)}
                            disabled={updateHabit.isPending || !(habitEditNames[habit.id] ?? "").trim()}
                          >
                            Save name
                          </Button>
                          <Button
                            variant="ghost"
                            className="h-9 px-3"
                            onClick={() => {
                              setHabitEditNames((prev) => ({
                                ...prev,
                                [habit.id]: habit.name
                              }));
                              setHabitEditingId(null);
                            }}
                            disabled={updateHabit.isPending}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <p className="font-medium">{habit.name}</p>
                          <Button
                            variant="ghost"
                            className="h-8 px-3 text-xs"
                            onClick={() => setHabitEditingId(habit.id)}
                          >
                            Edit name
                          </Button>
                        </>
                      )}
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
                      className="rounded-xl border border-border bg-[rgba(255,255,255,0.94)] px-2 py-1 text-xs shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
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
                    {habitDeleteConfirmId === habit.id ? (
                      <>
                        <Button
                          variant="danger"
                          onClick={() => deleteHabit.mutate(habit.id)}
                          disabled={deleteHabit.isPending}
                        >
                          {deleteHabit.isPending ? "Deleting..." : "Confirm delete"}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => setHabitDeleteConfirmId(null)}
                          disabled={deleteHabit.isPending}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="ghost"
                        onClick={() => setHabitDeleteConfirmId(habit.id)}
                      >
                        Delete
                      </Button>
                    )}
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

                {habitDeleteConfirmId === habit.id ? (
                  <p className="text-xs text-red-600">
                    Deleting this habit also removes its tracking history. This action cannot be undone.
                  </p>
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
