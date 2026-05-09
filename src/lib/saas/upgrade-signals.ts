type LockedFeature = {
  code: string;
  title: string;
  description: string;
  availableOn: string;
  enabled: boolean;
};

type InterestRequest = {
  type: "pro" | "team";
  status: string;
  requestCount: number;
  updatedAt: string;
};

type InviteRequest = {
  status: string;
  requestCount: number;
  requestedSeatCount: number;
  inviteEmails: string[];
  updatedAt: string;
};

type UpgradeSignalInput = {
  planCode: string;
  usage: {
    habitsCount: number;
    teamMembersCount: number;
  };
  entitlements: {
    maxHabits: number | "unlimited";
    analyticsWindowDays: number;
    canUseAdvancedAnalytics: boolean;
    canUseEmailReminders: boolean;
    canExportData: boolean;
    canUseMonthlyReview: boolean;
    canUseTeamFeatures: boolean;
  };
  lockedFeatures: LockedFeature[];
  interestRequests: InterestRequest[];
  inviteRequest: InviteRequest | null;
};

export type UpgradeSignalSummary = {
  headline: string;
  description: string;
  primaryActionLabel: string;
  primaryActionHref: string;
  secondaryActionLabel: string;
  secondaryActionHref: string;
  recommendedTrack: "pro" | "team";
  activeState:
    | "none"
    | "pro_interest_pending"
    | "pro_interest_active"
    | "team_interest_pending"
    | "team_interest_active"
    | "team_invite_pending"
    | "team_invite_reviewed"
    | "team_invite_approved"
    | "team_invite_closed";
};

function hasHabitLimitPressure(input: UpgradeSignalInput) {
  if (input.entitlements.maxHabits === "unlimited") return false;
  return input.usage.habitsCount >= Math.max(1, input.entitlements.maxHabits - 1);
}

export function getUpgradeSignalSummary(input: UpgradeSignalInput): UpgradeSignalSummary {
  const proInterest = input.interestRequests.find((request) => request.type === "pro");
  const teamInterest = input.interestRequests.find((request) => request.type === "team");
  const teamInviteRequest = input.inviteRequest;
  const hasTeamFeatureLocked = input.lockedFeatures.some((feature) => feature.code === "team_workspaces");
  const prefersProTrack = hasHabitLimitPressure(input) || input.lockedFeatures.some((feature) => feature.code === "advanced_analytics");

  if (teamInviteRequest) {
    if (teamInviteRequest.status === "approved") {
      return {
        headline: "Team invite request approved",
        description: `We captured ${teamInviteRequest.requestedSeatCount} requested seats. Review the workspace team section while rollout details are finalized.`,
        primaryActionLabel: "Review Team request",
        primaryActionHref: "/settings#workspace-members",
        secondaryActionLabel: "Compare Team plan",
        secondaryActionHref: "/pricing",
        recommendedTrack: "team",
        activeState: "team_invite_approved"
      };
    }

    if (teamInviteRequest.status === "reviewed") {
      return {
        headline: "Team invite request under review",
        description: `Your workspace requested ${teamInviteRequest.requestedSeatCount} seats. Keep the invite list updated while we review rollout timing.`,
        primaryActionLabel: "Review Team request",
        primaryActionHref: "/settings#workspace-members",
        secondaryActionLabel: "Open Team pricing",
        secondaryActionHref: "/pricing",
        recommendedTrack: "team",
        activeState: "team_invite_reviewed"
      };
    }

    if (teamInviteRequest.status === "closed") {
      return {
        headline: "Team request closed",
        description: "This Team invite request was closed. You can submit a fresh request anytime if your collaboration plans change.",
        primaryActionLabel: "Open Team pricing",
        primaryActionHref: "/pricing",
        secondaryActionLabel: "Request Team again",
        secondaryActionHref: "/settings#workspace-members",
        recommendedTrack: "team",
        activeState: "team_invite_closed"
      };
    }

    return {
      headline: "Team invite request saved",
      description: `Your workspace is in the Team rollout queue with ${teamInviteRequest.requestedSeatCount} requested seats. Keep the request current from Settings.`,
      primaryActionLabel: "Manage Team request",
      primaryActionHref: "/settings#workspace-members",
      secondaryActionLabel: "Compare Team plan",
      secondaryActionHref: "/pricing",
      recommendedTrack: "team",
      activeState: "team_invite_pending"
    };
  }

  if (teamInterest) {
    return {
      headline: "Team interest already saved",
      description: "You already signaled that this workspace will need collaboration. The next step is to submit a structured Team invite request when seats are clearer.",
      primaryActionLabel: "Request Team access",
      primaryActionHref: "/settings#workspace-members",
      secondaryActionLabel: "Compare Team plan",
      secondaryActionHref: "/pricing",
      recommendedTrack: "team",
      activeState: teamInterest.status === "pending" ? "team_interest_pending" : "team_interest_active"
    };
  }

  if (proInterest) {
    return {
      headline: "Pro interest already saved",
      description: "Your Pro waitlist request is already captured. Use Pricing to review what Pro will unlock next for this workspace.",
      primaryActionLabel: "Review Pro path",
      primaryActionHref: "/pricing",
      secondaryActionLabel: "See workspace settings",
      secondaryActionHref: "/settings#workspace-settings",
      recommendedTrack: "pro",
      activeState: proInterest.status === "pending" ? "pro_interest_pending" : "pro_interest_active"
    };
  }

  if (prefersProTrack) {
    return {
      headline: "You are close to the Free plan edge",
      description: "This workspace is nearing its current limits. Pro is the next clean unlock for analytics depth, exports, and more habit capacity.",
      primaryActionLabel: "Join Pro waitlist",
      primaryActionHref: "/pricing",
      secondaryActionLabel: "Review plan limits",
      secondaryActionHref: "/settings#workspace-settings",
      recommendedTrack: "pro",
      activeState: "none"
    };
  }

  if (hasTeamFeatureLocked) {
    return {
      headline: "This workspace is Team-ready",
      description: "The product foundation already supports collaboration. When you are ready to add people, start with a Team request from Settings.",
      primaryActionLabel: "Request Team access",
      primaryActionHref: "/settings#workspace-members",
      secondaryActionLabel: "Compare plans",
      secondaryActionHref: "/pricing",
      recommendedTrack: "team",
      activeState: "none"
    };
  }

  return {
    headline: "Your workspace is on Free",
    description: "Keep using the full planning core now, then signal Pro or Team when you want deeper insights or collaboration.",
    primaryActionLabel: "Compare plans",
    primaryActionHref: "/pricing",
    secondaryActionLabel: "Review workspace settings",
    secondaryActionHref: "/settings#workspace-settings",
    recommendedTrack: "pro",
    activeState: "none"
  };
}

export function getTeamInvitePipelineGuidance(request: {
  status: string;
  requestCount: number;
  requestedSeatCount: number;
  inviteEmails: string[];
}) {
  const listedInvites = request.inviteEmails.length;
  const rolloutLabel =
    request.requestedSeatCount >= 12 ? "Broader rollout" : request.requestedSeatCount >= 5 ? "Team pilot" : "Small pilot";

  if (request.status === "approved") {
    return {
      rolloutLabel,
      nextAction: "Confirm the first rollout wave, keep notes current, and prepare the eventual invite conversion step."
    };
  }

  if (request.status === "reviewed") {
    return {
      rolloutLabel,
      nextAction: "Validate the seat count, confirm who should join first, then decide whether to approve or keep reviewing."
    };
  }

  if (request.status === "closed") {
    return {
      rolloutLabel,
      nextAction: "No immediate action is required. Reopen only if collaboration demand changes."
    };
  }

  if (request.requestCount > 1 || listedInvites >= 3) {
    return {
      rolloutLabel,
      nextAction: "This request shows repeated intent. Review quickly, add notes, and move it out of pending once seats look realistic."
    };
  }

  return {
    rolloutLabel,
    nextAction: "Review the request, sense-check the requested seats, and mark it reviewed if it looks like a real near-term team need."
  };
}
