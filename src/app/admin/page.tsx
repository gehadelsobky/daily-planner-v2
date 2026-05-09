import { notFound, redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getSessionUser } from "@/lib/auth/session";
import { getAdminAccess } from "@/lib/admin/access";
import { getAdminOverview } from "@/lib/admin/overview";
import { prisma } from "@/lib/db";

function formatDateTime(value: string | null) {
  if (!value) return "No activity yet";
  return new Date(value).toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function prettify(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export default async function AdminPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const access = getAdminAccess(user);
  if (!access.isAdmin) {
    notFound();
  }

  const resolvedSearchParams = (await searchParams) ?? {};
  const rawQuery = resolvedSearchParams.q;
  const query = Array.isArray(rawQuery) ? rawQuery[0] : rawQuery;
  const overview = await getAdminOverview(prisma, query);

  return (
    <main className="mx-auto max-w-[1280px] space-y-5 px-4 py-6">
      <Card className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Internal Operations</p>
              <h1 className="text-3xl font-semibold tracking-tight">Admin Overview</h1>
            </div>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              Monitor signups, onboarding health, workspace growth, and notification load from one internal panel.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{overview.users.total} users</Badge>
            <Badge className="bg-white text-[hsl(var(--foreground))] shadow-none">{overview.workspaces.total} workspaces</Badge>
            <Badge className="bg-white text-[hsl(var(--foreground))] shadow-none">Generated {formatDateTime(overview.generatedAt)}</Badge>
          </div>
        </div>

        {access.accessMode === "local_fallback" ? (
          <div className="rounded-[1rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Local fallback admin access is active because <code>ADMIN_EMAILS</code> is not configured yet. Set it before relying on this in production.
          </div>
        ) : null}

        <form method="GET" className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_150px]">
          <input
            type="search"
            name="q"
            defaultValue={query ?? ""}
            placeholder="Search user email, name, or workspace"
            className="h-12 rounded-[1rem] border border-border bg-white px-4 text-sm shadow-[0_6px_18px_rgba(15,23,42,0.04)] outline-none transition focus:border-[#00b0ff]"
          />
          <button className="h-12 rounded-[1rem] bg-[linear-gradient(135deg,#1745C7,#0a0087)] px-4 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(23,69,199,0.18)]">
            Search
          </button>
        </form>
      </Card>

      <section className="grid gap-4 lg:grid-cols-5">
        <Card className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Users</p>
          <p className="text-3xl font-semibold">{overview.users.total}</p>
          <p className="text-sm text-muted-foreground">{overview.users.activeLast7Days} active in last 7 days</p>
        </Card>
        <Card className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Workspaces</p>
          <p className="text-3xl font-semibold">{overview.workspaces.total}</p>
          <p className="text-sm text-muted-foreground">
            {overview.workspaces.personal} personal, {overview.workspaces.team} team
          </p>
        </Card>
        <Card className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Subscriptions</p>
          <p className="text-3xl font-semibold">{overview.subscriptions.total}</p>
          <p className="text-sm text-muted-foreground">
            {Object.entries(overview.subscriptions.byPlan)
              .map(([plan, count]) => `${plan.toUpperCase()}: ${count}`)
              .join(" · ") || "No subscriptions yet"}
          </p>
        </Card>
        <Card className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Notifications</p>
          <p className="text-3xl font-semibold">{overview.notifications.totalUnread}</p>
          <p className="text-sm text-muted-foreground">{overview.notifications.carryoverUnread} carryover alerts still unread</p>
        </Card>
        <Card className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Upgrade signals</p>
          <p className="text-3xl font-semibold">{overview.interestRequests.total}</p>
          <p className="text-sm text-muted-foreground">{overview.interestRequests.pending} pending follow-up</p>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Onboarding Funnel</p>
              <p className="text-sm text-muted-foreground">See where new accounts are pausing so we can improve activation.</p>
            </div>
            <Badge className="bg-white text-[hsl(var(--foreground))] shadow-none">{overview.users.pendingVerification} pending verification</Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {overview.onboarding.map((item) => (
              <div key={item.state} className="rounded-[1rem] border border-border bg-white/88 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{prettify(item.state)}</p>
                <p className="mt-2 text-2xl font-semibold">{item.count}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="space-y-4">
          <div>
            <p className="text-sm font-semibold">Account Risk Watch</p>
            <p className="text-sm text-muted-foreground">A small checklist for support and security attention.</p>
          </div>
          <div className="space-y-3">
            <div className="rounded-[1rem] border border-border bg-white/88 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Locked accounts</p>
              <p className="mt-1 text-2xl font-semibold">{overview.users.locked}</p>
            </div>
            <div className="rounded-[1rem] border border-border bg-white/88 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Active in last 30 days</p>
              <p className="mt-1 text-2xl font-semibold">{overview.users.activeLast30Days}</p>
            </div>
          </div>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-4">
          <div>
            <p className="text-sm font-semibold">Recent Signups</p>
            <p className="text-sm text-muted-foreground">Latest users with lifecycle state so support can see who may need help.</p>
          </div>
          <div className="space-y-3">
            {overview.recentUsers.map((recentUser) => (
              <div key={recentUser.id} className="rounded-[1rem] border border-border bg-white/88 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{recentUser.name}</p>
                    <p className="text-sm text-muted-foreground">{recentUser.email}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge className="bg-white text-[hsl(var(--foreground))] shadow-none">{prettify(recentUser.onboardingState)}</Badge>
                    <Badge>{prettify(recentUser.accountStatus)}</Badge>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Joined {formatDateTime(recentUser.createdAt)} · Last active {formatDateTime(recentUser.lastActiveAt)}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="space-y-4">
          <div>
            <p className="text-sm font-semibold">Recent Notifications</p>
            <p className="text-sm text-muted-foreground">Quick visibility into the latest alerts being generated by the system.</p>
          </div>
          <div className="space-y-3">
            {overview.recentNotifications.map((notification) => (
              <div key={notification.id} className="rounded-[1rem] border border-border bg-white/88 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{notification.title}</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge className="bg-white text-[hsl(var(--foreground))] shadow-none">{prettify(notification.type)}</Badge>
                    <Badge>{prettify(notification.status)}</Badge>
                  </div>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {notification.userName} · {notification.userEmail}
                  {notification.workspaceName ? ` · ${notification.workspaceName}` : ""}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(notification.createdAt)}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Plan Interest Signals</p>
              <p className="text-sm text-muted-foreground">Track which workspaces are asking for Pro or Team next.</p>
            </div>
            <Badge className="bg-white text-[hsl(var(--foreground))] shadow-none">
              {Object.entries(overview.interestRequests.byType)
                .map(([type, count]) => `${type.toUpperCase()}: ${count}`)
                .join(" · ") || "No requests yet"}
            </Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-[1rem] border border-border bg-white/88 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Pending requests</p>
              <p className="mt-2 text-2xl font-semibold">{overview.interestRequests.pending}</p>
            </div>
            <div className="rounded-[1rem] border border-border bg-white/88 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Total interest requests</p>
              <p className="mt-2 text-2xl font-semibold">{overview.interestRequests.total}</p>
            </div>
          </div>
        </Card>

        <Card className="space-y-4">
          <div>
            <p className="text-sm font-semibold">Recent Plan Interest</p>
            <p className="text-sm text-muted-foreground">These are the latest upgrade or collaboration signals from real workspaces.</p>
          </div>
          <div className="space-y-3">
            {overview.recentInterestRequests.length ? (
              overview.recentInterestRequests.map((request) => (
                <div key={request.id} className="rounded-[1rem] border border-border bg-white/88 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{request.workspaceName}</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-white text-[hsl(var(--foreground))] shadow-none">{request.type.toUpperCase()}</Badge>
                      <Badge>{prettify(request.status)}</Badge>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {request.requesterName} · {request.requesterEmail}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Source: {request.source} · Requested {request.requestCount} time{request.requestCount === 1 ? "" : "s"} · Updated {formatDateTime(request.updatedAt)}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No upgrade or Team interest requests have been captured yet.</p>
            )}
          </div>
        </Card>
      </section>

      {overview.search.query ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <Card className="space-y-4">
            <div>
              <p className="text-sm font-semibold">User Lookup</p>
              <p className="text-sm text-muted-foreground">Matches for “{overview.search.query}”.</p>
            </div>
            <div className="space-y-3">
              {overview.search.users.length ? (
                overview.search.users.map((searchUser) => (
                  <div key={searchUser.id} className="rounded-[1rem] border border-border bg-white/88 px-4 py-3">
                    <p className="font-medium">{searchUser.name}</p>
                    <p className="text-sm text-muted-foreground">{searchUser.email}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {prettify(searchUser.accountStatus)} · {prettify(searchUser.onboardingState)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No matching users found.</p>
              )}
            </div>
          </Card>

          <Card className="space-y-4">
            <div>
              <p className="text-sm font-semibold">Workspace Lookup</p>
              <p className="text-sm text-muted-foreground">Matching workspaces and current plan state.</p>
            </div>
            <div className="space-y-3">
              {overview.search.workspaces.length ? (
                overview.search.workspaces.map((workspace) => (
                  <div key={workspace.id} className="rounded-[1rem] border border-border bg-white/88 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{workspace.name}</p>
                      <div className="flex flex-wrap gap-2">
                        <Badge className="bg-white text-[hsl(var(--foreground))] shadow-none">{workspace.planCode.toUpperCase()}</Badge>
                        <Badge>{prettify(workspace.billingStatus)}</Badge>
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{workspace.ownerEmail}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No matching workspaces found.</p>
              )}
            </div>
          </Card>
        </section>
      ) : null}
    </main>
  );
}
