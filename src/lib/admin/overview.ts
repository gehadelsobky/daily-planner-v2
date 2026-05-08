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
  onboarding: Array<{
    state: string;
    count: number;
  }>;
  notifications: {
    totalUnread: number;
    carryoverUnread: number;
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

export async function getAdminOverview(prisma: DbClient, query?: string): Promise<AdminOverview> {
  const trimmedQuery = query?.trim() || null;
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

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
    unreadNotifications,
    carryoverUnread,
    onboardingCounts,
    recentUsers,
    recentNotifications,
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
    onboarding: onboardingStateOrder.map((state) => ({
      state,
      count: onboardingMap.get(state) ?? 0
    })),
    notifications: {
      totalUnread: unreadNotifications,
      carryoverUnread
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
