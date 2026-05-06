import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { requireCurrentWorkspace } from "@/lib/saas/workspace-context";

export async function GET(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const workspace = await requireCurrentWorkspace(auth.user.id);

  const { searchParams } = new URL(req.url);
  const rawLimit = Number(searchParams.get("limit") ?? "20");
  const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(100, Math.trunc(rawLimit))) : 20;

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: auth.user.id, workspaceId: workspace.id },
      orderBy: { createdAt: "desc" },
      take: limit
    }),
    prisma.notification.count({
      where: { userId: auth.user.id, workspaceId: workspace.id, status: "unread" }
    })
  ]);

  return NextResponse.json({ notifications, unreadCount });
}
