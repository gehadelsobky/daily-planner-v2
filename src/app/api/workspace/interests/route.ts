import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseJson } from "@/lib/http";
import { checkRateLimit } from "@/lib/rate-limit";
import { buildRateLimitKey } from "@/lib/request";
import { requireWorkspaceContext } from "@/lib/saas/workspace-runtime";
import { recordWorkspaceConversionEvent } from "@/lib/saas/conversion-events";
import { touchUserActivity } from "@/lib/saas/account-lifecycle";
import { workspaceInterestCreateSchema } from "@/lib/validation/schemas";

export async function POST(req: Request) {
  const ctx = await requireWorkspaceContext();
  if (!ctx.ok) return ctx.response;

  const { user, workspace } = ctx.context;

  if (!(await checkRateLimit(buildRateLimitKey(["workspace-interest", user.id]), 12, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "Too many interest requests. Please try again later." }, { status: 429 });
  }

  const parsed = await parseJson(req, workspaceInterestCreateSchema);
  if (!parsed.ok) return parsed.response;

  const interest = await prisma.workspaceInterest.upsert({
    where: {
      workspaceId_type: {
        workspaceId: workspace.id,
        type: parsed.data.type
      }
    },
    create: {
      workspaceId: workspace.id,
      requestedByUserId: user.id,
      type: parsed.data.type,
      source: parsed.data.source,
      status: "pending"
    },
    update: {
      source: parsed.data.source,
      requestedByUserId: user.id,
      status: "pending",
      lastRequestedAt: new Date(),
      requestCount: {
        increment: 1
      }
    }
  });

  await recordWorkspaceConversionEvent(prisma, {
    workspaceId: workspace.id,
    userId: user.id,
    eventType: parsed.data.type === "pro" ? "pro_interest_requested" : "team_interest_requested",
    source: parsed.data.source,
    recommendedTrack: parsed.data.type,
    activeState: interest.status
  });

  await touchUserActivity(prisma, user.id);

  return Response.json({
    success: true,
    request: {
      id: interest.id,
      type: interest.type,
      status: interest.status,
      requestCount: interest.requestCount,
      lastRequestedAt: interest.lastRequestedAt.toISOString()
    }
  });
}
