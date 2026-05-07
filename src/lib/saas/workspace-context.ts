import { prisma } from "@/lib/db";
import { requireWorkspaceContextFromUser } from "@/lib/saas/workspace-runtime";
import { WorkspaceStatus, WorkspaceType } from "@prisma/client";

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
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error(`No user found for id ${userId}`);
  }
  return (await requireWorkspaceContextFromUser(user)).workspace;
}
