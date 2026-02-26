import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth/guard";
import { parseJson } from "@/lib/http";
import { habitCreateSchema } from "@/lib/validation/schemas";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const parsed = await parseJson(req, habitCreateSchema);
  if (!parsed.ok) return parsed.response;

  if (parsed.data.frequency === "custom" && (!parsed.data.custom_days || parsed.data.custom_days.length === 0)) {
    return Response.json({ error: "Custom habits require at least one selected day" }, { status: 400 });
  }

  const habit = await prisma.habit.create({
    data: {
      userId: auth.user.id,
      name: parsed.data.name,
      frequency: parsed.data.frequency,
      targetValue: parsed.data.target_value,
      targetUnit: parsed.data.target_unit,
      customDays: parsed.data.custom_days === null ? Prisma.DbNull : parsed.data.custom_days
    }
  });

  return Response.json({ habit });
}
