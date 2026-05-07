import { WorkspaceMemberStatus, WorkspaceStatus, WorkspaceType } from "@prisma/client";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getPlanEntitlements, PlanCode, PlanEntitlements } from "@/lib/saas/plans";

type SessionUser = NonNullable<Awaited<ReturnType<typeof getSessionUser>>>;

export type WorkspaceEntitlements = PlanEntitlements;

export type WorkspaceRuntimeContext = {
  user: SessionUser;
  workspace: {
    id: string;
    name: string;
    slug: string | null;
    ownerUserId: string;
    type: WorkspaceType;
    status: WorkspaceStatus;
  };
  membership: {
    id: string;
    role: string;
    status: WorkspaceMemberStatus;
    joinedAt: Date;
  };
  subscription: {
    id: string;
    planCode: PlanCode | string;
    billingStatus: WorkspaceEntitlements["billingStatus"];
  };
  planCode: PlanCode | string;
  entitlements: WorkspaceEntitlements;
};

export async function getCurrentWorkspaceContextForUser(
  user: SessionUser
): Promise<WorkspaceRuntimeContext | null> {
  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId: user.id,
      status: WorkspaceMemberStatus.active,
      workspace: {
        status: WorkspaceStatus.active,
        type: WorkspaceType.personal
      }
    },
    include: {
      workspace: true
    },
    orderBy: {
      joinedAt: "asc"
    }
  });

  if (!membership) {
    return null;
  }

  const subscription = await prisma.subscription.findUnique({
    where: { workspaceId: membership.workspaceId }
  });

  if (!subscription) {
    return null;
  }

  return {
    user,
    workspace: membership.workspace,
    membership: {
      id: membership.id,
      role: membership.role,
      status: membership.status,
      joinedAt: membership.joinedAt
    },
    subscription: {
      id: subscription.id,
      planCode: subscription.planCode,
      billingStatus: subscription.billingStatus
    },
    planCode: subscription.planCode,
    entitlements: getPlanEntitlements(subscription.planCode, subscription.billingStatus)
  };
}

export async function requireWorkspaceContext() {
  const user = await getSessionUser();
  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    };
  }

  const context = await getCurrentWorkspaceContextForUser(user);
  if (!context) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Workspace context unavailable" }, { status: 500 })
    };
  }

  return { ok: true as const, context };
}

export async function requireWorkspaceContextFromUser(user: SessionUser) {
  const context = await getCurrentWorkspaceContextForUser(user);
  if (!context) {
    throw new Error(`No active workspace context found for user ${user.id}`);
  }
  return context;
}
