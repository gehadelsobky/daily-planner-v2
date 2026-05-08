import { prisma } from "@/lib/db";
import { parseJson } from "@/lib/http";
import { requireWorkspaceContext } from "@/lib/saas/workspace-runtime";
import { workspaceUpdateSchema } from "@/lib/validation/schemas";

export async function PATCH(req: Request) {
  const ctx = await requireWorkspaceContext();
  if (!ctx.ok) return ctx.response;

  const parsed = await parseJson(req, workspaceUpdateSchema);
  if (!parsed.ok) return parsed.response;

  if (!["owner", "admin"].includes(ctx.context.membership.role)) {
    return Response.json({ error: "Only workspace owners can update workspace settings." }, { status: 403 });
  }

  const updated = await prisma.workspace.update({
    where: { id: ctx.context.workspace.id },
    data: {
      name: parsed.data.name.trim()
    }
  });

  return Response.json({
    workspace: {
      id: updated.id,
      name: updated.name,
      type: updated.type,
      status: updated.status
    }
  });
}
