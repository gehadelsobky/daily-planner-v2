import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseJson } from "@/lib/http";
import { checkRateLimit } from "@/lib/rate-limit";
import { buildRateLimitKey } from "@/lib/request";
import { requireWorkspaceContext } from "@/lib/saas/workspace-runtime";
import { touchUserActivity } from "@/lib/saas/account-lifecycle";
import { recordWorkspaceConversionEvent } from "@/lib/saas/conversion-events";
import { workspaceInviteRequestCreateSchema } from "@/lib/validation/schemas";

function normalizeInviteEmails(values: string[]) {
  return [...new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))];
}

export async function POST(req: Request) {
  const ctx = await requireWorkspaceContext();
  if (!ctx.ok) return ctx.response;

  const { user, workspace } = ctx.context;

  if (!(await checkRateLimit(buildRateLimitKey(["workspace-invite-request", user.id]), 10, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "Too many Team invite requests. Please try again later." }, { status: 429 });
  }

  const parsed = await parseJson(req, workspaceInviteRequestCreateSchema);
  if (!parsed.ok) return parsed.response;

  const inviteEmails = normalizeInviteEmails(parsed.data.invite_emails);
  const requestedSeatCount = Math.max(parsed.data.requested_seat_count, inviteEmails.length + 1);
  const message = parsed.data.message?.trim() || null;

  const request = await prisma.workspaceInviteRequest.upsert({
    where: { workspaceId: workspace.id },
    create: {
      workspaceId: workspace.id,
      requestedByUserId: user.id,
      source: parsed.data.source,
      requestedSeatCount,
      inviteEmails,
      message,
      status: "pending"
    },
    update: {
      requestedByUserId: user.id,
      source: parsed.data.source,
      requestedSeatCount,
      inviteEmails,
      message,
      status: "pending",
      lastRequestedAt: new Date(),
      requestCount: {
        increment: 1
      }
    },
    select: {
      id: true,
      status: true,
      requestCount: true,
      requestedSeatCount: true,
      inviteEmails: true,
      lastRequestedAt: true,
      updatedAt: true
    }
  });

  await recordWorkspaceConversionEvent(prisma, {
    workspaceId: workspace.id,
    userId: user.id,
    eventType: "team_invite_requested",
    source: parsed.data.source,
    recommendedTrack: "team",
    activeState: request.status
  });

  await touchUserActivity(prisma, user.id);

  return Response.json({
    success: true,
    request: {
      ...request,
      inviteEmails: Array.isArray(request.inviteEmails) ? request.inviteEmails : [],
      lastRequestedAt: request.lastRequestedAt.toISOString(),
      updatedAt: request.updatedAt.toISOString()
    }
  });
}
