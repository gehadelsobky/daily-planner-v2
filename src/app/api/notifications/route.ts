import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireWorkspaceContext } from "@/lib/saas/workspace-runtime";

export async function GET(req: Request) {
  const ctx = await requireWorkspaceContext();
  if (!ctx.ok) return ctx.response;
  const { user, workspace } = ctx.context;

  const { searchParams } = new URL(req.url);
  const rawLimit = Number(searchParams.get("limit") ?? "20");
  const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(100, Math.trunc(rawLimit))) : 20;

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id, workspaceId: workspace.id },
      orderBy: { createdAt: "desc" },
      take: limit
    }),
    prisma.notification.count({
      where: { userId: user.id, workspaceId: workspace.id, status: "unread" }
    })
  ]);

  return NextResponse.json({ notifications, unreadCount });
}
