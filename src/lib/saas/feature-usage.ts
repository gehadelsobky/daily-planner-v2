import { WorkspaceMemberStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

export const FEATURE_CODES = {
  habitsCount: "habits_count",
  teamMembersCount: "team_members_count"
} as const;

export type WorkspaceUsageSnapshot = {
  habitsCount: number;
  teamMembersCount: number;
  periodKey: string;
};

export function getUsagePeriodKey(date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export async function getWorkspaceUsageSnapshot(
  workspaceId: string,
  periodKey = getUsagePeriodKey()
): Promise<WorkspaceUsageSnapshot> {
  const [habitsCount, teamMembersCount] = await Promise.all([
    prisma.habit.count({
      where: { workspaceId }
    }),
    prisma.workspaceMember.count({
      where: {
        workspaceId,
        status: WorkspaceMemberStatus.active
      }
    })
  ]);

  return {
    habitsCount,
    teamMembersCount,
    periodKey
  };
}

export async function syncWorkspaceFeatureUsage(
  workspaceId: string,
  periodKey = getUsagePeriodKey()
): Promise<WorkspaceUsageSnapshot> {
  const snapshot = await getWorkspaceUsageSnapshot(workspaceId, periodKey);

  await prisma.$transaction([
    prisma.featureUsage.upsert({
      where: {
        workspaceId_featureCode_periodKey: {
          workspaceId,
          featureCode: FEATURE_CODES.habitsCount,
          periodKey
        }
      },
      update: { usedCount: snapshot.habitsCount },
      create: {
        workspaceId,
        featureCode: FEATURE_CODES.habitsCount,
        periodKey,
        usedCount: snapshot.habitsCount
      }
    }),
    prisma.featureUsage.upsert({
      where: {
        workspaceId_featureCode_periodKey: {
          workspaceId,
          featureCode: FEATURE_CODES.teamMembersCount,
          periodKey
        }
      },
      update: { usedCount: snapshot.teamMembersCount },
      create: {
        workspaceId,
        featureCode: FEATURE_CODES.teamMembersCount,
        periodKey,
        usedCount: snapshot.teamMembersCount
      }
    })
  ]);

  return snapshot;
}
