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
