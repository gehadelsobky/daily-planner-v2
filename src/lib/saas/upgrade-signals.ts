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
  pipelineStage: string | null;
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
  contextLabel: string;
  urgencyLabel: string;
  primaryActionLabel: string;
  primaryActionShortLabel: string;
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
    | "team_invite_contacted"
    | "team_invite_qualified"
    | "team_invite_scheduled"
    | "team_invite_approved"
    | "team_invite_converted"
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
        contextLabel: "Team rollout approved",
        urgencyLabel: "High-intent workspace",
        primaryActionLabel: "Review Team request",
        primaryActionShortLabel: "Review Team",
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
        contextLabel: "Team request in review",
        urgencyLabel: "Admin follow-up active",
        primaryActionLabel: "Review Team request",
        primaryActionShortLabel: "Review Team",
        primaryActionHref: "/settings#workspace-members",
        secondaryActionLabel: "Open Team pricing",
        secondaryActionHref: "/pricing",
        recommendedTrack: "team",
        activeState: "team_invite_reviewed"
      };
    }

    if (teamInviteRequest.pipelineStage === "contacted") {
      return {
        headline: "Team rollout contact started",
        description: "We have started outreach for this Team request. Keep the seat list current while rollout details are discussed.",
        contextLabel: "Team outreach started",
        urgencyLabel: "Collaboration signal active",
        primaryActionLabel: "Review Team request",
        primaryActionShortLabel: "Open Team",
        primaryActionHref: "/settings#workspace-members",
        secondaryActionLabel: "Open Team pricing",
        secondaryActionHref: "/pricing",
        recommendedTrack: "team",
        activeState: "team_invite_contacted"
      };
    }

    if (teamInviteRequest.pipelineStage === "qualified") {
      return {
        headline: "Team request qualified",
        description: `This workspace looks like a strong Team candidate. Keep the requested ${teamInviteRequest.requestedSeatCount} seats and invite list aligned while rollout is finalized.`,
        contextLabel: "Qualified for Team",
        urgencyLabel: "Best next step: Team",
        primaryActionLabel: "Review Team request",
        primaryActionShortLabel: "Team next",
        primaryActionHref: "/settings#workspace-members",
        secondaryActionLabel: "Compare Team plan",
        secondaryActionHref: "/pricing",
        recommendedTrack: "team",
        activeState: "team_invite_qualified"
      };
    }

    if (teamInviteRequest.pipelineStage === "scheduled") {
      return {
        headline: "Team onboarding scheduled",
        description: "This Team request has moved into scheduling. Keep the invite emails updated so the rollout can start without rework.",
        contextLabel: "Onboarding scheduled",
        urgencyLabel: "Invite list should stay current",
        primaryActionLabel: "Review Team request",
        primaryActionShortLabel: "Review Team",
        primaryActionHref: "/settings#workspace-members",
        secondaryActionLabel: "Open Team pricing",
        secondaryActionHref: "/pricing",
        recommendedTrack: "team",
        activeState: "team_invite_scheduled"
      };
    }

    if (teamInviteRequest.status === "closed") {
      return {
        headline: "Team request closed",
        description: "This Team invite request was closed. You can submit a fresh request anytime if your collaboration plans change.",
        contextLabel: "Team request closed",
        urgencyLabel: "Re-open when needed",
        primaryActionLabel: "Open Team pricing",
        primaryActionShortLabel: "Re-open Team",
        primaryActionHref: "/pricing",
        secondaryActionLabel: "Request Team again",
        secondaryActionHref: "/settings#workspace-members",
        recommendedTrack: "team",
        activeState: "team_invite_closed"
      };
    }

    if (teamInviteRequest.pipelineStage === "converted") {
      return {
        headline: "Team rollout converted",
        description: "This workspace has already moved through the Team rollout pipeline. Collaboration features can be finalized from the workspace settings path later.",
        contextLabel: "Converted through Team pipeline",
        urgencyLabel: "Collaboration-ready workspace",
        primaryActionLabel: "Review Team request",
        primaryActionShortLabel: "Team live",
        primaryActionHref: "/settings#workspace-members",
        secondaryActionLabel: "Open Team pricing",
        secondaryActionHref: "/pricing",
        recommendedTrack: "team",
        activeState: "team_invite_converted"
      };
    }

    return {
      headline: "Team invite request saved",
      description: `Your workspace is in the Team rollout queue with ${teamInviteRequest.requestedSeatCount} requested seats. Keep the request current from Settings.`,
      contextLabel: "Team request saved",
      urgencyLabel: "Waiting for rollout follow-up",
      primaryActionLabel: "Manage Team request",
      primaryActionShortLabel: "Manage Team",
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
      contextLabel: "Team demand captured",
      urgencyLabel: "Next step: seat planning",
      primaryActionLabel: "Request Team access",
      primaryActionShortLabel: "Plan Team",
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
      contextLabel: "Pro demand captured",
      urgencyLabel: "Good fit for deeper insight",
      primaryActionLabel: "Review Pro path",
      primaryActionShortLabel: "Review Pro",
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
      contextLabel: "Near Free limit",
      urgencyLabel: "Best next step: Pro",
      primaryActionLabel: "Join Pro waitlist",
      primaryActionShortLabel: "Pro next",
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
      contextLabel: "Team-ready foundation",
      urgencyLabel: "Best next step: Team",
      primaryActionLabel: "Request Team access",
      primaryActionShortLabel: "Team next",
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
    contextLabel: "Healthy Free workspace",
    urgencyLabel: "No immediate pressure",
    primaryActionLabel: "Compare plans",
    primaryActionShortLabel: "See plans",
    primaryActionHref: "/pricing",
    secondaryActionLabel: "Review workspace settings",
    secondaryActionHref: "/settings#workspace-settings",
    recommendedTrack: "pro",
    activeState: "none"
  };
}

export function getTeamInvitePipelineGuidance(request: {
  status: string;
  pipelineStage: string | null;
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

  if (request.pipelineStage === "contacted") {
    return {
      rolloutLabel,
      nextAction: "Initial outreach has started. Confirm the primary contact, validate urgency, and decide whether the request is serious enough to qualify."
    };
  }

  if (request.pipelineStage === "qualified") {
    return {
      rolloutLabel,
      nextAction: "This looks like a real team need. Confirm the first seats, expected timeline, and move it toward scheduling."
    };
  }

  if (request.pipelineStage === "scheduled") {
    return {
      rolloutLabel,
      nextAction: "Prepare the launch sequence, confirm who will be invited first, and keep notes aligned before approval."
    };
  }

  if (request.pipelineStage === "converted") {
    return {
      rolloutLabel,
      nextAction: "This request has completed the current pipeline. Capture any final internal notes and use it as a reference for future Team rollouts."
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
