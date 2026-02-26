import { requireUser } from "@/lib/auth/guard";
import { parseJson } from "@/lib/http";
import { profileUpdateSchema } from "@/lib/validation/schemas";
import { prisma } from "@/lib/db";
import { isValidTimezone } from "@/lib/date";

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  return Response.json({
    profile: {
      id: auth.user.id,
      email: auth.user.email,
      name: auth.user.name,
      timezone: auth.user.timezone,
      weekStartDay: auth.user.weekStartDay,
      waterDefaultTarget: auth.user.waterDefaultTarget,
      waterDefaultUnit: auth.user.waterDefaultUnit,
      dailyLayout: asStringArray(auth.user.dailyLayout)
    }
  });
}

export async function PATCH(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const parsed = await parseJson(req, profileUpdateSchema);
  if (!parsed.ok) return parsed.response;

  if (parsed.data.timezone && !isValidTimezone(parsed.data.timezone)) {
    return Response.json({ error: "Invalid timezone" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: auth.user.id },
    data: {
      name: parsed.data.name,
      timezone: parsed.data.timezone,
      weekStartDay: parsed.data.week_start_day,
      waterDefaultTarget: parsed.data.water_default_target,
      waterDefaultUnit: parsed.data.water_default_unit,
      dailyLayout: parsed.data.daily_layout
    }
  });

  return Response.json({
    profile: {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      timezone: updated.timezone,
      weekStartDay: updated.weekStartDay,
      waterDefaultTarget: updated.waterDefaultTarget,
      waterDefaultUnit: updated.waterDefaultUnit,
      dailyLayout: asStringArray(updated.dailyLayout)
    }
  });
}
