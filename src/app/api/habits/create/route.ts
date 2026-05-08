import { Prisma } from "@prisma/client";
import { parseJson } from "@/lib/http";
import { habitCreateSchema } from "@/lib/validation/schemas";
import { prisma } from "@/lib/db";
import { canCreateAnotherHabit } from "@/lib/saas/plans";
import { requireWorkspaceContext } from "@/lib/saas/workspace-runtime";
import { syncWorkspaceFeatureUsage } from "@/lib/saas/feature-usage";
import { syncUserLifecycle, touchUserActivity } from "@/lib/saas/account-lifecycle";

export async function POST(req: Request) {
  const ctx = await requireWorkspaceContext();
  if (!ctx.ok) return ctx.response;
  const { user, workspace, entitlements } = ctx.context;

  const parsed = await parseJson(req, habitCreateSchema);
  if (!parsed.ok) return parsed.response;

  if (parsed.data.frequency === "custom" && (!parsed.data.custom_days || parsed.data.custom_days.length === 0)) {
    return Response.json({ error: "Custom habits require at least one selected day" }, { status: 400 });
  }

  const currentHabitCount = await prisma.habit.count({
    where: { userId: user.id, workspaceId: workspace.id }
  });
  if (!canCreateAnotherHabit(entitlements, currentHabitCount)) {
    return Response.json(
      {
        error: `Your current plan allows up to ${entitlements.maxHabits} habits.`
      },
      { status: 403 }
    );
  }

  const habit = await prisma.habit.create({
    data: {
      userId: user.id,
      workspaceId: workspace.id,
      name: parsed.data.name,
      frequency: parsed.data.frequency,
      targetValue: parsed.data.target_value,
      targetUnit: parsed.data.target_unit,
      customDays: parsed.data.custom_days === null ? Prisma.DbNull : parsed.data.custom_days
    }
  });

  await syncWorkspaceFeatureUsage(workspace.id);
  await touchUserActivity(prisma, user.id);
  await syncUserLifecycle(prisma, user.id);

  return Response.json({ habit });
}
