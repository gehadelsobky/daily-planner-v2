import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guard";
import { parseJson } from "@/lib/http";
import { habitUpdateSchema } from "@/lib/validation/schemas";
import { prisma } from "@/lib/db";

export async function PATCH(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const parsed = await parseJson(req, habitUpdateSchema);
  if (!parsed.ok) return parsed.response;

  const habit = await prisma.habit.findUnique({ where: { id: parsed.data.habit_id } });
  if (!habit || habit.userId !== auth.user.id) {
    return NextResponse.json({ error: "Habit not found" }, { status: 404 });
  }

  const nextFrequency = parsed.data.frequency ?? habit.frequency;
  const nextCustomDays =
    parsed.data.custom_days !== undefined
      ? parsed.data.custom_days
      : Array.isArray(habit.customDays)
        ? habit.customDays
        : null;

  if (nextFrequency === "custom" && (!nextCustomDays || nextCustomDays.length === 0)) {
    return NextResponse.json({ error: "Custom habits require at least one selected day" }, { status: 400 });
  }

  const updated = await prisma.habit.update({
    where: { id: habit.id },
    data: {
      name: parsed.data.name,
      frequency: parsed.data.frequency,
      targetValue: parsed.data.target_value,
      targetUnit: parsed.data.target_unit,
      customDays: parsed.data.custom_days === null ? Prisma.DbNull : parsed.data.custom_days,
      isActive: parsed.data.is_active
    }
  });

  return Response.json({ habit: updated });
}
