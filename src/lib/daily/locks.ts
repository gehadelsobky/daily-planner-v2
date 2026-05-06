import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireCurrentWorkspace } from "@/lib/saas/workspace-context";

export async function getClosedEntry(userId: string, date: Date, workspaceId?: string) {
  const resolvedWorkspaceId = workspaceId ?? (await requireCurrentWorkspace(userId)).id;
  return prisma.dailyEntry.findFirst({
    where: { userId, workspaceId: resolvedWorkspaceId, date },
    select: { id: true, closedAt: true }
  });
}

export async function rejectIfDayClosed(userId: string, date: Date, workspaceId?: string) {
  const entry = await getClosedEntry(userId, date, workspaceId);
  if (entry?.closedAt) {
    return NextResponse.json(
      { error: "This day is closed and can no longer be edited." },
      { status: 409 }
    );
  }

  return null;
}
