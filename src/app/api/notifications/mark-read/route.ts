import { NextResponse } from "next/server";
import { NotificationStatus } from "@prisma/client";
import { requireUser } from "@/lib/auth/guard";
import { parseJson } from "@/lib/http";
import { prisma } from "@/lib/db";
import { requireCurrentWorkspace } from "@/lib/saas/workspace-context";
import { notificationBulkSchema } from "@/lib/validation/schemas";

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const workspace = await requireCurrentWorkspace(auth.user.id);

  const parsed = await parseJson(req, notificationBulkSchema);
  if (!parsed.ok) return parsed.response;

  const updated = await prisma.notification.updateMany({
    where: {
      id: { in: parsed.data.notification_ids },
      userId: auth.user.id,
      workspaceId: workspace.id
    },
    data: {
      status: NotificationStatus.read,
      readAt: new Date()
    }
  });

  return NextResponse.json({ ok: true, updated: updated.count });
}
