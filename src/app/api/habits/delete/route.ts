import { NextResponse } from "next/server";
import { parseJson } from "@/lib/http";
import { prisma } from "@/lib/db";
import { habitDeleteSchema } from "@/lib/validation/schemas";
import { checkRateLimit } from "@/lib/rate-limit";
import { buildRateLimitKey } from "@/lib/request";
import { requireWorkspaceContext } from "@/lib/saas/workspace-runtime";
import { syncWorkspaceFeatureUsage } from "@/lib/saas/feature-usage";
import { syncUserLifecycle, touchUserActivity } from "@/lib/saas/account-lifecycle";

export async function DELETE(req: Request) {
  const ctx = await requireWorkspaceContext();
  if (!ctx.ok) return ctx.response;
  const { user, workspace } = ctx.context;

  if (!(await checkRateLimit(buildRateLimitKey(["habit-delete", user.id]), 40, 60_000))) {
    return NextResponse.json({ error: "Too many rapid habit updates" }, { status: 429 });
  }

  const parsed = await parseJson(req, habitDeleteSchema);
  if (!parsed.ok) return parsed.response;

  const habit = await prisma.habit.findUnique({
    where: { id: parsed.data.habit_id }
  });

  if (!habit || habit.userId !== user.id || habit.workspaceId !== workspace.id) {
    return NextResponse.json({ error: "Habit not found" }, { status: 404 });
  }

  await prisma.habit.delete({
    where: { id: habit.id }
  });

  await syncWorkspaceFeatureUsage(workspace.id);
  await touchUserActivity(prisma, user.id);
  await syncUserLifecycle(prisma, user.id);

  return Response.json({ success: true });
}
