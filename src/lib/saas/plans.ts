import { BillingStatus } from "@prisma/client";

export type PlanCode = "free" | "pro" | "team";

export type PlanEntitlements = {
  planCode: PlanCode;
  billingStatus: BillingStatus;
  maxWorkspaces: number;
  maxMembersPerWorkspace: number;
  maxHabits: number | "unlimited";
  analyticsWindowDays: number;
  canUseAdvancedAnalytics: boolean;
  canUseEmailReminders: boolean;
  canExportData: boolean;
  canUseMonthlyReview: boolean;
  canUseTeamFeatures: boolean;
};

export type FeatureGateCode =
  | "advanced_analytics"
  | "monthly_review"
  | "email_reminders"
  | "data_exports"
  | "team_workspaces";

export type FeatureGateStatus = {
  code: FeatureGateCode;
  title: string;
  description: string;
  availableOn: PlanCode;
  enabled: boolean;
};

const PLAN_DEFAULTS: Record<PlanCode, Omit<PlanEntitlements, "billingStatus">> = {
  free: {
    planCode: "free",
    maxWorkspaces: 1,
    maxMembersPerWorkspace: 1,
    maxHabits: 10,
    analyticsWindowDays: 90,
    canUseAdvancedAnalytics: false,
    canUseEmailReminders: false,
    canExportData: false,
    canUseMonthlyReview: false,
    canUseTeamFeatures: false
  },
  pro: {
    planCode: "pro",
    maxWorkspaces: 1,
    maxMembersPerWorkspace: 1,
    maxHabits: "unlimited",
    analyticsWindowDays: 365,
    canUseAdvancedAnalytics: true,
    canUseEmailReminders: true,
    canExportData: true,
    canUseMonthlyReview: true,
    canUseTeamFeatures: false
  },
  team: {
    planCode: "team",
    maxWorkspaces: 1,
    maxMembersPerWorkspace: 10,
    maxHabits: "unlimited",
    analyticsWindowDays: 365,
    canUseAdvancedAnalytics: true,
    canUseEmailReminders: true,
    canExportData: true,
    canUseMonthlyReview: true,
    canUseTeamFeatures: true
  }
};

export function isPlanCode(value: string): value is PlanCode {
  return value === "free" || value === "pro" || value === "team";
}

export function getPlanEntitlements(
  planCode: string,
  billingStatus: BillingStatus
): PlanEntitlements {
  const normalizedCode: PlanCode = isPlanCode(planCode) ? planCode : "free";
  return {
    ...PLAN_DEFAULTS[normalizedCode],
    billingStatus
  };
}

export function canCreateAnotherHabit(entitlements: PlanEntitlements, currentHabitCount: number) {
  return entitlements.maxHabits === "unlimited" || currentHabitCount < entitlements.maxHabits;
}

export function getFeatureGateStatuses(entitlements: PlanEntitlements): FeatureGateStatus[] {
  return [
    {
      code: "advanced_analytics",
      title: "Advanced analytics",
      description: "Deeper trend analysis, stronger comparisons, and richer productivity insights.",
      availableOn: "pro",
      enabled: entitlements.canUseAdvancedAnalytics
    },
    {
      code: "monthly_review",
      title: "Monthly review",
      description: "Longer reflection cycles with monthly summaries and archived review history.",
      availableOn: "pro",
      enabled: entitlements.canUseMonthlyReview
    },
    {
      code: "email_reminders",
      title: "Email reminders",
      description: "Scheduled reminder emails and weekly summary nudges that protect consistency.",
      availableOn: "pro",
      enabled: entitlements.canUseEmailReminders
    },
    {
      code: "data_exports",
      title: "Data exports",
      description: "Export your planner data and reporting views when you need to move or archive it.",
      availableOn: "pro",
      enabled: entitlements.canExportData
    },
    {
      code: "team_workspaces",
      title: "Team workspace",
      description: "Invite members, share planning context, and collaborate inside one workspace.",
      availableOn: "team",
      enabled: entitlements.canUseTeamFeatures
    }
  ];
}

export function getLockedFeatureStatuses(entitlements: PlanEntitlements): FeatureGateStatus[] {
  return getFeatureGateStatuses(entitlements).filter((feature) => !feature.enabled);
}
