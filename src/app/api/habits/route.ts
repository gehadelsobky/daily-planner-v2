import { prisma } from "@/lib/db";
import { requireWorkspaceContext } from "@/lib/saas/workspace-runtime";

export async function GET() {
  const ctx = await requireWorkspaceContext();
  if (!ctx.ok) return ctx.response;
  const { user, workspace } = ctx.context;

  const habits = await prisma.habit.findMany({
    where: { userId: user.id, workspaceId: workspace.id },
    orderBy: [{ isActive: "desc" }, { name: "asc" }]
  });

  return Response.json({ habits });
}
