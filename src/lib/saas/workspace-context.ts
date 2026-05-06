import { WorkspaceStatus, WorkspaceType } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function getCurrentWorkspaceForUser(userId: string) {
  return prisma.workspace.findFirst({
    where: {
      ownerUserId: userId,
      type: WorkspaceType.personal,
      status: WorkspaceStatus.active
    },
    orderBy: {
      createdAt: "asc"
    }
  });
}

export async function requireCurrentWorkspace(userId: string) {
  const workspace = await getCurrentWorkspaceForUser(userId);
  if (!workspace) {
    throw new Error(`No active workspace found for user ${userId}`);
  }
  return workspace;
}
