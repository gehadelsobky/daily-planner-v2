import {
  BillingStatus,
  Prisma,
  PrismaClient,
  WorkspaceMemberStatus,
  WorkspaceRole,
  WorkspaceStatus,
  WorkspaceType
} from "@prisma/client";

type WorkspaceDbClient = Prisma.TransactionClient | PrismaClient;

type PersonalWorkspaceUser = {
  id: string;
  email: string;
  name: string;
};

export type EnsurePersonalWorkspaceResult = {
  workspaceId: string;
  createdWorkspace: boolean;
  createdMembership: boolean;
  createdSubscription: boolean;
};

export function buildPersonalWorkspaceName(name: string): string {
  const trimmed = name.trim();
  return trimmed ? `${trimmed} Workspace` : "Personal Workspace";
}

export function buildWorkspaceSlug(email: string, userId: string): string {
  const local = email.split("@")[0] ?? "workspace";
  const normalized = local
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${normalized || "workspace"}-${userId.slice(0, 8)}-personal`;
}

export async function ensurePersonalWorkspace(
  db: WorkspaceDbClient,
  user: PersonalWorkspaceUser
): Promise<EnsurePersonalWorkspaceResult> {
  const desiredName = buildPersonalWorkspaceName(user.name);
  const desiredSlug = buildWorkspaceSlug(user.email, user.id);

  const existingWorkspace = await db.workspace.findFirst({
    where: {
      ownerUserId: user.id,
      type: WorkspaceType.personal
    },
    orderBy: {
      createdAt: "asc"
    }
  });

  let workspaceId: string;
  let createdWorkspace = false;

  if (existingWorkspace) {
    workspaceId = existingWorkspace.id;

    if (existingWorkspace.name !== desiredName || !existingWorkspace.slug || existingWorkspace.status !== WorkspaceStatus.active) {
      await db.workspace.update({
        where: { id: existingWorkspace.id },
        data: {
          name: existingWorkspace.name || desiredName,
          slug: existingWorkspace.slug ?? desiredSlug,
          status: WorkspaceStatus.active
        }
      });
    }
  } else {
    const workspace = await db.workspace.create({
      data: {
        name: desiredName,
        slug: desiredSlug,
        ownerUserId: user.id,
        type: WorkspaceType.personal,
        status: WorkspaceStatus.active
      }
    });
    workspaceId = workspace.id;
    createdWorkspace = true;
  }

  const existingMembership = await db.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId: user.id
      }
    }
  });

  let createdMembership = false;
  if (existingMembership) {
    if (existingMembership.role !== WorkspaceRole.owner || existingMembership.status !== WorkspaceMemberStatus.active) {
      await db.workspaceMember.update({
        where: { id: existingMembership.id },
        data: {
          role: WorkspaceRole.owner,
          status: WorkspaceMemberStatus.active
        }
      });
    }
  } else {
    await db.workspaceMember.create({
      data: {
        workspaceId,
        userId: user.id,
        role: WorkspaceRole.owner,
        status: WorkspaceMemberStatus.active
      }
    });
    createdMembership = true;
  }

  const existingSubscription = await db.subscription.findUnique({
    where: { workspaceId }
  });

  let createdSubscription = false;
  if (existingSubscription) {
    if (
      existingSubscription.planCode !== "free" ||
      existingSubscription.billingStatus !== BillingStatus.free ||
      existingSubscription.cancelAtPeriodEnd
    ) {
      await db.subscription.update({
        where: { id: existingSubscription.id },
        data: {
          planCode: "free",
          billingStatus: BillingStatus.free,
          cancelAtPeriodEnd: false
        }
      });
    }
  } else {
    await db.subscription.create({
      data: {
        workspaceId,
        planCode: "free",
        billingStatus: BillingStatus.free,
        cancelAtPeriodEnd: false
      }
    });
    createdSubscription = true;
  }

  return {
    workspaceId,
    createdWorkspace,
    createdMembership,
    createdSubscription
  };
}
