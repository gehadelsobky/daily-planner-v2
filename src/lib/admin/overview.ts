import { OnboardingState, PrismaClient } from "@prisma/client";

type DbClient = PrismaClient;

export type AdminOverview = {
  generatedAt: string;
  users: {
    total: number;
    activeLast7Days: number;
    activeLast30Days: number;
    pendingVerification: number;
    locked: number;
  };
  workspaces: {
    total: number;
    personal: number;
    team: number;
  };
  subscriptions: {
    total: number;
    byPlan: Record<string, number>;
    byStatus: Record<string, number>;
  };
  interestRequests: {
    total: number;
    pending: number;
    byType: Record<string, number>;
  };
  inviteRequests: {
    total: number;
    pending: number;
    byStatus: Record<string, number>;
  };
  conversionEvents: {
    total: number;
    byType: Record<string, number>;
    byTrack: Record<string, number>;
  };
  conversionFunnel: {
    ctaClicks: number;
    proInterestRequests: number;
    teamInterestRequests: number;
    teamInviteRequests: number;
    teamPipelineActive: number;
  };
  sourcePerformance: Array<{
    source: string;
    clicks: number;
    proInterest: number;
    teamInterest: number;
    teamInvite: number;
    totalSignals: number;
    clickToProRatio: number;
    clickToTeamRatio: number;
    clickToInviteRatio: number;
  }>;
  conversionTrends: Array<{
    day: string;
    ctaClicks: number;
    proInterestRequests: number;
    teamInterestRequests: number;
    teamInviteRequests: number;
  }>;
  workspaceConversionLeaders: Array<{
    workspaceId: string;
    workspaceName: string;
    ownerEmail: string;
    planCode: string;
    billingStatus: string;
    recommendedTrack: "pro" | "team";
    ctaClicks: number;
    proInterest: number;
    teamInterest: number;
    teamInvites: number;
    totalSignals: number;
    activePipelineStage: string | null;
    requestedSeatCount: number | null;
    lastSignalAt: string | null;
  }>;
  onboarding: Array<{
    state: string;
    count: number;
  }>;
  notifications: {
    totalUnread: number;
    carryoverUnread: number;
  };
  adminAudit: {
    totalLast7Days: number;
  };
  recentUsers: Array<{
    id: string;
    name: string;
    email: string;
    createdAt: string;
    lastActiveAt: string | null;
    onboardingState: string;
    accountStatus: string;
  }>;
  recentNotifications: Array<{
    id: string;
    title: string;
    type: string;
    status: string;
    createdAt: string;
    userName: string;
    userEmail: string;
    workspaceName: string | null;
  }>;
  recentInterestRequests: Array<{
    id: string;
    type: string;
    status: string;
    source: string;
    requestCount: number;
    notes: string | null;
    lastRequestedAt: string;
    updatedAt: string;
    workspaceName: string;
    requesterName: string;
    requesterEmail: string;
  }>;
  recentInviteRequests: Array<{
    id: string;
    status: string;
    pipelineStage: string | null;
    source: string;
    requestCount: number;
    requestedSeatCount: number;
    inviteEmails: string[];
    message: string | null;
    notes: string | null;
    lastRequestedAt: string;
    updatedAt: string;
    workspaceName: string;
    requesterName: string;
    requesterEmail: string;
  }>;
  recentConversionEvents: Array<{
    id: string;
    eventType: string;
    source: string;
    recommendedTrack: string | null;
    activeState: string | null;
    targetHref: string | null;
    createdAt: string;
    workspaceName: string;
    userName: string;
    userEmail: string;
  }>;
  recentAdminAuditLogs: Array<{
    id: string;
    action: string;
    targetType: string;
    targetId: string;
    createdAt: string;
    adminName: string;
    adminEmail: string;
  }>;
  search: {
    query: string | null;
    users: Array<{
      id: string;
      name: string;
      email: string;
      accountStatus: string;
      onboardingState: string;
    }>;
    workspaces: Array<{
      id: string;
      name: string;
      planCode: string;
      billingStatus: string;
      ownerEmail: string;
    }>;
  };
};

function formatDate(date: Date | null) {
  return date ? date.toISOString() : null;
}

function formatDayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function safeRatio(numerator: number, denominator: number) {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 100);
}

export async function getAdminOverview(prisma: DbClient, query?: string): Promise<AdminOverview> {
  const trimmedQuery = query?.trim() || null;
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    activeLast7Days,
    activeLast30Days,
    pendingVerification,
    lockedUsers,
    totalWorkspaces,
    personalWorkspaces,
    teamWorkspaces,
    totalSubscriptions,
    subscriptionsByPlan,
    subscriptionsByStatus,
    totalInterestRequests,
    pendingInterestRequests,
    interestRequestsByType,
    totalInviteRequests,
    pendingInviteRequests,
    inviteRequestsByStatus,
    totalConversionEvents,
    conversionEventsByType,
    conversionEventsBySource,
    conversionEventsLast14Days,
    conversionEventsLast30Days,
    recentConversionEvents,
    totalAdminAuditLast7Days,
    recentAdminAuditLogs,
    unreadNotifications,
    carryoverUnread,
    onboardingCounts,
    recentUsers,
    recentNotifications,
    recentInterestRequests,
    recentInviteRequests,
    workspaceInterestSignals,
    workspaceInviteSignals,
    searchedUsers,
    searchedWorkspaces
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { lastActiveAt: { gte: sevenDaysAgo } } }),
    prisma.user.count({ where: { lastActiveAt: { gte: thirtyDaysAgo } } }),
    prisma.user.count({ where: { accountStatus: "pending_verification" } }),
    prisma.user.count({ where: { accountStatus: "locked" } }),
    prisma.workspace.count(),
    prisma.workspace.count({ where: { type: "personal" } }),
    prisma.workspace.count({ where: { type: "team" } }),
    prisma.subscription.count(),
    prisma.subscription.groupBy({
      by: ["planCode"],
      _count: { _all: true }
    }),
    prisma.subscription.groupBy({
      by: ["billingStatus"],
      _count: { _all: true }
    }),
    prisma.workspaceInterest.count(),
    prisma.workspaceInterest.count({ where: { status: "pending" } }),
    prisma.workspaceInterest.groupBy({
      by: ["type"],
      _count: { _all: true }
    }),
    prisma.workspaceInviteRequest.count(),
    prisma.workspaceInviteRequest.count({ where: { status: "pending" } }),
    prisma.workspaceInviteRequest.groupBy({
      by: ["status"],
      _count: { _all: true }
    }),
    prisma.workspaceConversionEvent.count(),
    prisma.workspaceConversionEvent.groupBy({
      by: ["eventType", "recommendedTrack"],
      _count: { _all: true }
    }),
    prisma.workspaceConversionEvent.groupBy({
      by: ["source", "eventType"],
      _count: { _all: true }
    }),
    prisma.workspaceConversionEvent.findMany({
      where: { createdAt: { gte: fourteenDaysAgo } },
      select: {
        eventType: true,
        createdAt: true
      }
    }),
    prisma.workspaceConversionEvent.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: {
        workspaceId: true,
        eventType: true,
        createdAt: true,
        workspace: {
          select: {
            name: true,
            subscription: {
              select: {
                planCode: true,
                billingStatus: true
              }
            },
            owner: {
              select: {
                email: true
              }
            }
          }
        }
      }
    }),
    prisma.workspaceConversionEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        eventType: true,
        source: true,
        recommendedTrack: true,
        activeState: true,
        targetHref: true,
        createdAt: true,
        workspace: {
          select: {
            name: true
          }
        },
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    }),
    prisma.adminAuditLog.count({
      where: {
        createdAt: { gte: sevenDaysAgo }
      }
    }),
    prisma.adminAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        action: true,
        targetType: true,
        targetId: true,
        createdAt: true,
        adminUser: {
          select: {
            name: true,
            email: true
          }
        }
      }
    }),
    prisma.notification.count({ where: { status: "unread" } }),
    prisma.notification.count({ where: { status: "unread", type: "carryover_tasks" } }),
    prisma.user.groupBy({
      by: ["onboardingState"],
      _count: { _all: true }
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        lastActiveAt: true,
        onboardingState: true,
        accountStatus: true
      }
    }),
    prisma.notification.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        createdAt: true,
        user: {
          select: {
            name: true,
            email: true
          }
        },
        workspace: {
          select: {
            name: true
          }
        }
      }
    }),
    prisma.workspaceInterest.findMany({
      orderBy: { updatedAt: "desc" },
      take: 8,
      select: {
        id: true,
        type: true,
        status: true,
        source: true,
        requestCount: true,
        notes: true,
        lastRequestedAt: true,
        updatedAt: true,
        workspace: {
          select: {
            name: true
          }
        },
        requestedBy: {
          select: {
            name: true,
            email: true
          }
        }
      }
    }),
    prisma.workspaceInviteRequest.findMany({
      orderBy: { updatedAt: "desc" },
      take: 8,
      select: {
        id: true,
        status: true,
        pipelineStage: true,
        source: true,
        requestCount: true,
        requestedSeatCount: true,
        inviteEmails: true,
        message: true,
        notes: true,
        lastRequestedAt: true,
        updatedAt: true,
        workspace: {
          select: {
            name: true
          }
        },
        requestedBy: {
          select: {
            name: true,
            email: true
          }
        }
      }
    }),
    prisma.workspaceInterest.findMany({
      where: { lastRequestedAt: { gte: thirtyDaysAgo } },
      select: {
        workspaceId: true,
        type: true,
        lastRequestedAt: true,
        workspace: {
          select: {
            name: true,
            subscription: {
              select: {
                planCode: true,
                billingStatus: true
              }
            },
            owner: {
              select: {
                email: true
              }
            }
          }
        }
      }
    }),
    prisma.workspaceInviteRequest.findMany({
      where: { lastRequestedAt: { gte: thirtyDaysAgo } },
      select: {
        workspaceId: true,
        pipelineStage: true,
        requestedSeatCount: true,
        lastRequestedAt: true,
        workspace: {
          select: {
            name: true,
            subscription: {
              select: {
                planCode: true,
                billingStatus: true
              }
            },
            owner: {
              select: {
                email: true
              }
            }
          }
        }
      }
    }),
    trimmedQuery
      ? prisma.user.findMany({
          where: {
            OR: [
              { email: { contains: trimmedQuery, mode: "insensitive" } },
              { name: { contains: trimmedQuery, mode: "insensitive" } }
            ]
          },
          take: 10,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            name: true,
            email: true,
            accountStatus: true,
            onboardingState: true
          }
        })
      : Promise.resolve([]),
    trimmedQuery
      ? prisma.workspace.findMany({
          where: {
            OR: [
              { name: { contains: trimmedQuery, mode: "insensitive" } },
              { owner: { email: { contains: trimmedQuery, mode: "insensitive" } } }
            ]
          },
          take: 10,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            name: true,
            subscription: {
              select: {
                planCode: true,
                billingStatus: true
              }
            },
            owner: {
              select: {
                email: true
              }
            }
          }
        })
      : Promise.resolve([])
  ]);

  const onboardingStateOrder = [
    OnboardingState.not_started,
    OnboardingState.profile_configured,
    OnboardingState.habits_started,
    OnboardingState.first_day_completed
  ];

  const onboardingMap = new Map(onboardingCounts.map((item) => [item.onboardingState, item._count._all]));
  const conversionByType = conversionEventsByType.reduce<Record<string, number>>((acc, row) => {
    acc[row.eventType] = (acc[row.eventType] ?? 0) + row._count._all;
    return acc;
  }, {});
  const conversionByTrack = conversionEventsByType.reduce<Record<string, number>>((acc, row) => {
    const key = row.recommendedTrack ?? "unknown";
    acc[key] = (acc[key] ?? 0) + row._count._all;
    return acc;
  }, {});
  const sourcePerformanceMap = conversionEventsBySource.reduce<
    Record<
      string,
      {
        source: string;
        clicks: number;
        proInterest: number;
        teamInterest: number;
        teamInvite: number;
        totalSignals: number;
        clickToProRatio: number;
        clickToTeamRatio: number;
        clickToInviteRatio: number;
      }
    >
  >((acc, row) => {
    const current =
      acc[row.source] ??
      {
        source: row.source,
        clicks: 0,
        proInterest: 0,
        teamInterest: 0,
        teamInvite: 0,
        totalSignals: 0,
        clickToProRatio: 0,
        clickToTeamRatio: 0,
        clickToInviteRatio: 0
      };

    if (row.eventType === "upgrade_cta_clicked") current.clicks += row._count._all;
    if (row.eventType === "pro_interest_requested") current.proInterest += row._count._all;
    if (row.eventType === "team_interest_requested") current.teamInterest += row._count._all;
    if (row.eventType === "team_invite_requested") current.teamInvite += row._count._all;
    current.totalSignals += row._count._all;
    acc[row.source] = current;
    return acc;
  }, {});
  const sourcePerformance = Object.values(sourcePerformanceMap)
    .map((item) => ({
      ...item,
      clickToProRatio: safeRatio(item.proInterest, item.clicks),
      clickToTeamRatio: safeRatio(item.teamInterest, item.clicks),
      clickToInviteRatio: safeRatio(item.teamInvite, item.clicks)
    }))
    .sort((a, b) => b.totalSignals - a.totalSignals)
    .slice(0, 8);
  const teamPipelineActive = recentInviteRequests.filter(
    (request) =>
      request.pipelineStage === "contacted" ||
      request.pipelineStage === "qualified" ||
      request.pipelineStage === "scheduled" ||
      request.pipelineStage === "converted"
  ).length;
  const conversionTrendMap = new Map<
    string,
    {
      day: string;
      ctaClicks: number;
      proInterestRequests: number;
      teamInterestRequests: number;
      teamInviteRequests: number;
    }
  >();

  for (let offset = 13; offset >= 0; offset -= 1) {
    const date = new Date(now.getTime() - offset * 24 * 60 * 60 * 1000);
    const day = formatDayKey(date);
    conversionTrendMap.set(day, {
      day,
      ctaClicks: 0,
      proInterestRequests: 0,
      teamInterestRequests: 0,
      teamInviteRequests: 0
    });
  }

  for (const event of conversionEventsLast14Days) {
    const day = formatDayKey(event.createdAt);
    const current = conversionTrendMap.get(day);
    if (!current) continue;

    if (event.eventType === "upgrade_cta_clicked") current.ctaClicks += 1;
    if (event.eventType === "pro_interest_requested") current.proInterestRequests += 1;
    if (event.eventType === "team_interest_requested") current.teamInterestRequests += 1;
    if (event.eventType === "team_invite_requested") current.teamInviteRequests += 1;
  }

  const conversionTrends = Array.from(conversionTrendMap.values());
  const workspaceConversionLeaderMap = new Map<
    string,
    {
      workspaceId: string;
      workspaceName: string;
      ownerEmail: string;
      planCode: string;
      billingStatus: string;
      recommendedTrack: "pro" | "team";
      ctaClicks: number;
      proInterest: number;
      teamInterest: number;
      teamInvites: number;
      totalSignals: number;
      activePipelineStage: string | null;
      requestedSeatCount: number | null;
      lastSignalAt: Date | null;
    }
  >();

  const getOrCreateWorkspaceLeader = (
    workspaceId: string,
    workspaceName: string,
    ownerEmail: string,
    planCode: string,
    billingStatus: string
  ) => {
    const existing = workspaceConversionLeaderMap.get(workspaceId);
    if (existing) return existing;
    const created = {
      workspaceId,
      workspaceName,
      ownerEmail,
      planCode,
      billingStatus,
      recommendedTrack: "pro" as const,
      ctaClicks: 0,
      proInterest: 0,
      teamInterest: 0,
      teamInvites: 0,
      totalSignals: 0,
      activePipelineStage: null,
      requestedSeatCount: null,
      lastSignalAt: null as Date | null
    };
    workspaceConversionLeaderMap.set(workspaceId, created);
    return created;
  };

  for (const event of conversionEventsLast30Days) {
    const current = getOrCreateWorkspaceLeader(
      event.workspaceId,
      event.workspace.name,
      event.workspace.owner.email,
      event.workspace.subscription?.planCode ?? "free",
      event.workspace.subscription?.billingStatus ?? "free"
    );

    if (event.eventType === "upgrade_cta_clicked") current.ctaClicks += 1;
    if (event.eventType === "pro_interest_requested") current.proInterest += 1;
    if (event.eventType === "team_interest_requested") current.teamInterest += 1;
    if (event.eventType === "team_invite_requested") current.teamInvites += 1;
    current.totalSignals += 1;
    if (!current.lastSignalAt || event.createdAt > current.lastSignalAt) {
      current.lastSignalAt = event.createdAt;
    }
  }

  for (const interest of workspaceInterestSignals) {
    const current = getOrCreateWorkspaceLeader(
      interest.workspaceId,
      interest.workspace.name,
      interest.workspace.owner.email,
      interest.workspace.subscription?.planCode ?? "free",
      interest.workspace.subscription?.billingStatus ?? "free"
    );

    if (interest.type === "pro") current.proInterest += 1;
    if (interest.type === "team") current.teamInterest += 1;
    current.totalSignals += 1;
    if (!current.lastSignalAt || interest.lastRequestedAt > current.lastSignalAt) {
      current.lastSignalAt = interest.lastRequestedAt;
    }
  }

  for (const invite of workspaceInviteSignals) {
    const current = getOrCreateWorkspaceLeader(
      invite.workspaceId,
      invite.workspace.name,
      invite.workspace.owner.email,
      invite.workspace.subscription?.planCode ?? "free",
      invite.workspace.subscription?.billingStatus ?? "free"
    );

    current.teamInvites += 1;
    current.totalSignals += 1;
    current.activePipelineStage = invite.pipelineStage;
    current.requestedSeatCount = invite.requestedSeatCount;
    if (!current.lastSignalAt || invite.lastRequestedAt > current.lastSignalAt) {
      current.lastSignalAt = invite.lastRequestedAt;
    }
  }

  const workspaceConversionLeaders = Array.from(workspaceConversionLeaderMap.values())
    .map((workspace) => ({
      ...workspace,
      recommendedTrack:
        workspace.teamInvites > 0 || workspace.teamInterest > workspace.proInterest ? ("team" as const) : ("pro" as const)
    }))
    .sort((a, b) => {
      if (b.totalSignals !== a.totalSignals) return b.totalSignals - a.totalSignals;
      return (b.lastSignalAt?.getTime() ?? 0) - (a.lastSignalAt?.getTime() ?? 0);
    })
    .slice(0, 8)
    .map((workspace) => ({
      workspaceId: workspace.workspaceId,
      workspaceName: workspace.workspaceName,
      ownerEmail: workspace.ownerEmail,
      planCode: workspace.planCode,
      billingStatus: workspace.billingStatus,
      recommendedTrack: workspace.recommendedTrack,
      ctaClicks: workspace.ctaClicks,
      proInterest: workspace.proInterest,
      teamInterest: workspace.teamInterest,
      teamInvites: workspace.teamInvites,
      totalSignals: workspace.totalSignals,
      activePipelineStage: workspace.activePipelineStage,
      requestedSeatCount: workspace.requestedSeatCount,
      lastSignalAt: formatDate(workspace.lastSignalAt)
    }));

  return {
    generatedAt: now.toISOString(),
    users: {
      total: totalUsers,
      activeLast7Days,
      activeLast30Days,
      pendingVerification,
      locked: lockedUsers
    },
    workspaces: {
      total: totalWorkspaces,
      personal: personalWorkspaces,
      team: teamWorkspaces
    },
    subscriptions: {
      total: totalSubscriptions,
      byPlan: Object.fromEntries(subscriptionsByPlan.map((item) => [item.planCode, item._count._all])),
      byStatus: Object.fromEntries(subscriptionsByStatus.map((item) => [item.billingStatus, item._count._all]))
    },
    interestRequests: {
      total: totalInterestRequests,
      pending: pendingInterestRequests,
      byType: Object.fromEntries(interestRequestsByType.map((item) => [item.type, item._count._all]))
    },
    inviteRequests: {
      total: totalInviteRequests,
      pending: pendingInviteRequests,
      byStatus: Object.fromEntries(inviteRequestsByStatus.map((row) => [row.status, row._count._all]))
    },
    conversionEvents: {
      total: totalConversionEvents,
      byType: conversionByType,
      byTrack: conversionByTrack
    },
    conversionFunnel: {
      ctaClicks: conversionByType.upgrade_cta_clicked ?? 0,
      proInterestRequests: conversionByType.pro_interest_requested ?? 0,
      teamInterestRequests: conversionByType.team_interest_requested ?? 0,
      teamInviteRequests: conversionByType.team_invite_requested ?? 0,
      teamPipelineActive
    },
    sourcePerformance,
    conversionTrends,
    workspaceConversionLeaders,
    onboarding: onboardingStateOrder.map((state) => ({
      state,
      count: onboardingMap.get(state) ?? 0
    })),
    notifications: {
      totalUnread: unreadNotifications,
      carryoverUnread
    },
    adminAudit: {
      totalLast7Days: totalAdminAuditLast7Days
    },
    recentUsers: recentUsers.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
      lastActiveAt: formatDate(user.lastActiveAt),
      onboardingState: user.onboardingState,
      accountStatus: user.accountStatus
    })),
    recentNotifications: recentNotifications.map((notification) => ({
      id: notification.id,
      title: notification.title,
      type: notification.type,
      status: notification.status,
      createdAt: notification.createdAt.toISOString(),
      userName: notification.user.name,
      userEmail: notification.user.email,
      workspaceName: notification.workspace?.name ?? null
    })),
    recentInterestRequests: recentInterestRequests.map((request) => ({
      id: request.id,
      type: request.type,
      status: request.status,
      source: request.source,
      requestCount: request.requestCount,
      notes: request.notes,
      lastRequestedAt: request.lastRequestedAt.toISOString(),
      updatedAt: request.updatedAt.toISOString(),
      workspaceName: request.workspace.name,
      requesterName: request.requestedBy.name,
      requesterEmail: request.requestedBy.email
    })),
    recentInviteRequests: recentInviteRequests.map((request) => ({
      id: request.id,
      status: request.status,
      pipelineStage: request.pipelineStage,
      source: request.source,
      requestCount: request.requestCount,
      requestedSeatCount: request.requestedSeatCount,
      inviteEmails: Array.isArray(request.inviteEmails)
        ? request.inviteEmails.filter((item): item is string => typeof item === "string")
        : [],
      message: request.message,
      notes: request.notes,
      lastRequestedAt: request.lastRequestedAt.toISOString(),
      updatedAt: request.updatedAt.toISOString(),
      workspaceName: request.workspace.name,
      requesterName: request.requestedBy.name,
      requesterEmail: request.requestedBy.email
    })),
    recentConversionEvents: recentConversionEvents.map((event) => ({
      id: event.id,
      eventType: event.eventType,
      source: event.source,
      recommendedTrack: event.recommendedTrack,
      activeState: event.activeState,
      targetHref: event.targetHref,
      createdAt: event.createdAt.toISOString(),
      workspaceName: event.workspace.name,
      userName: event.user.name,
      userEmail: event.user.email
    })),
    recentAdminAuditLogs: recentAdminAuditLogs.map((item) => ({
      id: item.id,
      action: item.action,
      targetType: item.targetType,
      targetId: item.targetId,
      createdAt: item.createdAt.toISOString(),
      adminName: item.adminUser.name,
      adminEmail: item.adminUser.email
    })),
    search: {
      query: trimmedQuery,
      users: searchedUsers.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        accountStatus: user.accountStatus,
        onboardingState: user.onboardingState
      })),
      workspaces: searchedWorkspaces.map((workspace) => ({
        id: workspace.id,
        name: workspace.name,
        planCode: workspace.subscription?.planCode ?? "free",
        billingStatus: workspace.subscription?.billingStatus ?? "free",
        ownerEmail: workspace.owner.email
      }))
    }
  };
}
