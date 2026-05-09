import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseJson } from "@/lib/http";
import { requireAdminUser } from "@/lib/admin/access";
import { workspaceInviteRequestAdminUpdateSchema } from "@/lib/validation/schemas";

type RouteContext = {
  params: Promise<{
    requestId: string;
  }>;
};

export async function PATCH(req: Request, context: RouteContext) {
  const admin = await requireAdminUser();
  if (!admin.ok) return admin.response;

  const { requestId } = await context.params;
  const parsed = await parseJson(req, workspaceInviteRequestAdminUpdateSchema);
  if (!parsed.ok) return parsed.response;

  const existing = await prisma.workspaceInviteRequest.findUnique({
    where: { id: requestId },
    select: { id: true }
  });

  if (!existing) {
    return NextResponse.json({ error: "Team invite request not found." }, { status: 404 });
  }

  const updated = await prisma.workspaceInviteRequest.update({
    where: { id: requestId },
    data: {
      status: parsed.data.status,
      pipelineStage: parsed.data.pipeline_stage ?? null,
      notes: (parsed.data.notes ?? "").trim() || null
    },
    select: {
      id: true,
      status: true,
      pipelineStage: true,
      notes: true,
      updatedAt: true
    }
  });

  return NextResponse.json({
    success: true,
    request: {
      ...updated,
      updatedAt: updated.updatedAt.toISOString()
    }
  });
}
