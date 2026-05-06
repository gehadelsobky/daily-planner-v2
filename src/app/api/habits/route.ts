import { requireUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { requireCurrentWorkspace } from "@/lib/saas/workspace-context";

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const workspace = await requireCurrentWorkspace(auth.user.id);

  const habits = await prisma.habit.findMany({
    where: { userId: auth.user.id, workspaceId: workspace.id },
    orderBy: [{ isActive: "desc" }, { name: "asc" }]
  });

  return Response.json({ habits });
}
