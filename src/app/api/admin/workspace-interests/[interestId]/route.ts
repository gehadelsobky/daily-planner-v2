import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseJson } from "@/lib/http";
import { requireAdminUser } from "@/lib/admin/access";
import { recordAdminAuditLog } from "@/lib/admin/audit";
import { workspaceInterestAdminUpdateSchema } from "@/lib/validation/schemas";

type RouteContext = {
  params: Promise<{
    interestId: string;
  }>;
};

export async function PATCH(req: Request, context: RouteContext) {
  const admin = await requireAdminUser();
  if (!admin.ok) return admin.response;

  const { interestId } = await context.params;
  const parsed = await parseJson(req, workspaceInterestAdminUpdateSchema);
  if (!parsed.ok) return parsed.response;

  const existing = await prisma.workspaceInterest.findUnique({
    where: { id: interestId },
    select: { id: true }
  });

  if (!existing) {
    return NextResponse.json({ error: "Interest request not found." }, { status: 404 });
  }

  const updated = await prisma.workspaceInterest.update({
    where: { id: interestId },
    data: {
      status: parsed.data.status,
      notes: (parsed.data.notes ?? "").trim() || null
    },
    select: {
      id: true,
      status: true,
      notes: true,
      updatedAt: true
    }
  });

  await recordAdminAuditLog(prisma, {
    adminUserId: admin.user.id,
    action: "workspace_interest_updated",
    targetType: "workspace_interest",
    targetId: updated.id,
    details: {
      status: updated.status,
      notes: updated.notes
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
