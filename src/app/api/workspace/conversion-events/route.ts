import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseJson } from "@/lib/http";
import { checkRateLimit } from "@/lib/rate-limit";
import { buildRateLimitKey } from "@/lib/request";
import { requireWorkspaceContext } from "@/lib/saas/workspace-runtime";
import { recordWorkspaceConversionEvent } from "@/lib/saas/conversion-events";
import { workspaceConversionEventCreateSchema } from "@/lib/validation/schemas";

export async function POST(req: Request) {
  const ctx = await requireWorkspaceContext();
  if (!ctx.ok) return ctx.response;

  const { user, workspace } = ctx.context;

  if (!(await checkRateLimit(buildRateLimitKey(["workspace-conversion-event", user.id]), 80, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "Too many conversion events. Please try again later." }, { status: 429 });
  }

  const parsed = await parseJson(req, workspaceConversionEventCreateSchema);
  if (!parsed.ok) return parsed.response;

  await recordWorkspaceConversionEvent(prisma, {
    workspaceId: workspace.id,
    userId: user.id,
    eventType: parsed.data.event_type,
    source: parsed.data.source,
    recommendedTrack: parsed.data.recommended_track,
    activeState: parsed.data.active_state,
    targetHref: parsed.data.target_href
  });

  return NextResponse.json({ success: true });
}
