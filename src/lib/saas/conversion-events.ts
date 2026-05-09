import type { PrismaClient } from "@prisma/client";

type DbClient = PrismaClient;

export type ConversionEventInput = {
  workspaceId: string;
  userId: string;
  eventType: "upgrade_cta_viewed" | "upgrade_cta_clicked" | "pro_interest_requested" | "team_interest_requested" | "team_invite_requested";
  source: string;
  recommendedTrack?: "pro" | "team";
  activeState?: string;
  targetHref?: string;
};

export async function recordWorkspaceConversionEvent(prisma: DbClient, input: ConversionEventInput) {
  return prisma.workspaceConversionEvent.create({
    data: {
      workspaceId: input.workspaceId,
      userId: input.userId,
      eventType: input.eventType,
      source: input.source,
      recommendedTrack: input.recommendedTrack,
      activeState: input.activeState,
      targetHref: input.targetHref
    }
  });
}
