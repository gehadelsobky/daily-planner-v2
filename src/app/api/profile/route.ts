import { requireUser } from "@/lib/auth/guard";
import { parseJson } from "@/lib/http";
import { profileUpdateSchema } from "@/lib/validation/schemas";
import { prisma } from "@/lib/db";
import { isValidTimezone } from "@/lib/date";
import { normalizePhoneDetails } from "@/lib/phone";
import { requireWorkspaceContextFromUser } from "@/lib/saas/workspace-runtime";
import { getWorkspaceUsageSnapshot } from "@/lib/saas/feature-usage";
import { getLockedFeatureStatuses } from "@/lib/saas/plans";

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const workspaceContext = await requireWorkspaceContextFromUser(auth.user);
  const usage = await getWorkspaceUsageSnapshot(workspaceContext.workspace.id);

  return Response.json({
    profile: {
      id: auth.user.id,
      email: auth.user.email,
      name: auth.user.name,
      phoneCountry: auth.user.phoneCountry,
      phoneNumber: auth.user.phoneNumber,
      phoneE164: auth.user.phoneE164,
      avatarUrl: auth.user.avatarUrl,
      timezone: auth.user.timezone,
      weekStartDay: auth.user.weekStartDay,
      waterDefaultTarget: auth.user.waterDefaultTarget,
      waterDefaultUnit: auth.user.waterDefaultUnit,
      dailyLayout: asStringArray(auth.user.dailyLayout)
    },
    workspace: {
      id: workspaceContext.workspace.id,
      name: workspaceContext.workspace.name,
      planCode: workspaceContext.planCode,
      billingStatus: workspaceContext.subscription.billingStatus,
      entitlements: workspaceContext.entitlements,
      usage,
      lockedFeatures: getLockedFeatureStatuses(workspaceContext.entitlements)
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

  const phoneDetails =
    parsed.data.phone_country && parsed.data.phone_number
      ? normalizePhoneDetails(parsed.data.phone_country, parsed.data.phone_number)
      : null;

  if (parsed.data.phone_country && parsed.data.phone_number && !phoneDetails) {
    return Response.json({ error: "Invalid phone number" }, { status: 400 });
  }

  if (phoneDetails) {
    const existingPhone = await prisma.user.findFirst({
      where: {
        phoneE164: phoneDetails.phoneE164,
        id: { not: auth.user.id }
      },
      select: { id: true }
    });

    if (existingPhone) {
      return Response.json({ error: "Phone number already in use" }, { status: 409 });
    }
  }

  const updated = await prisma.user.update({
    where: { id: auth.user.id },
    data: {
      name: parsed.data.name,
      phoneCountry: phoneDetails?.phoneCountry,
      phoneNumber: phoneDetails?.phoneNumber,
      phoneE164: phoneDetails?.phoneE164,
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
      phoneCountry: updated.phoneCountry,
      phoneNumber: updated.phoneNumber,
      phoneE164: updated.phoneE164,
      avatarUrl: updated.avatarUrl,
      timezone: updated.timezone,
      weekStartDay: updated.weekStartDay,
      waterDefaultTarget: updated.waterDefaultTarget,
      waterDefaultUnit: updated.waterDefaultUnit,
      dailyLayout: asStringArray(updated.dailyLayout)
    }
  });
}
