import { prisma } from "@/lib/db";
import { requireWorkspaceContext } from "@/lib/saas/workspace-runtime";

export async function GET() {
  const ctx = await requireWorkspaceContext();
  if (!ctx.ok) return ctx.response;

  const members = await prisma.workspaceMember.findMany({
    where: {
      workspaceId: ctx.context.workspace.id
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true
        }
      }
    },
    orderBy: [
      { role: "asc" },
      { joinedAt: "asc" }
    ]
  });

  return Response.json({
    workspace: {
      id: ctx.context.workspace.id,
      name: ctx.context.workspace.name,
      planCode: ctx.context.planCode,
      type: ctx.context.workspace.type
    },
    capabilities: {
      canInviteMembers: ctx.context.entitlements.canUseTeamFeatures,
      canManageRoles: ctx.context.entitlements.canUseTeamFeatures,
      maxMembers: ctx.context.entitlements.maxMembersPerWorkspace,
      currentMembers: members.filter((member) => member.status === "active").length,
      nextUnlockPlan: "team"
    },
    members: members.map((member) => ({
      id: member.id,
      userId: member.user.id,
      name: member.user.name,
      email: member.user.email,
      avatarUrl: member.user.avatarUrl,
      role: member.role,
      status: member.status,
      joinedAt: member.joinedAt,
      isCurrentUser: member.user.id === ctx.context.user.id
    }))
  });
}
