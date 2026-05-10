import { notFound, redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WorkspaceInterestReviewCard } from "@/components/admin/workspace-interest-review-card";
import { TeamInviteRequestReviewCard } from "@/components/admin/team-invite-request-review-card";
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

function formatSourceLabel(value: string) {
  return value
    .replaceAll("-", " ")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function ratioTone(value: number) {
  if (value >= 40) return "text-emerald-700";
  if (value >= 20) return "text-sky-700";
  return "text-muted-foreground";
}

function trackTone(value: "pro" | "team") {
  return value === "team"
    ? "bg-[rgba(31,217,181,0.14)] text-[#0a0087] shadow-none"
    : "bg-[rgba(0,176,255,0.12)] text-[#1745C7] shadow-none";
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
        <Card className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Invite requests</p>
          <p className="text-3xl font-semibold">{overview.inviteRequests.total}</p>
          <p className="text-sm text-muted-foreground">{overview.inviteRequests.pending} pending seat reviews</p>
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

      {query ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <Card className="space-y-4">
            <div>
              <p className="text-sm font-semibold">Matching Users</p>
              <p className="text-sm text-muted-foreground">Support lookup for user lifecycle and account status.</p>
            </div>
            <div className="space-y-3">
              {overview.search.users.length ? (
                overview.search.users.map((matchedUser) => (
                  <div key={matchedUser.id} className="rounded-[1rem] border border-border bg-white/88 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium">{matchedUser.name}</p>
                        <p className="text-sm text-muted-foreground">{matchedUser.email}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge className="bg-white text-[hsl(var(--foreground))] shadow-none">
                          {prettify(matchedUser.onboardingState)}
                        </Badge>
                        <Badge>{prettify(matchedUser.accountStatus)}</Badge>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No users matched this query.</p>
              )}
            </div>
          </Card>

          <Card className="space-y-4">
            <div>
              <p className="text-sm font-semibold">Matching Workspaces</p>
              <p className="text-sm text-muted-foreground">Quick lookup for workspace ownership and current plan state.</p>
            </div>
            <div className="space-y-3">
              {overview.search.workspaces.length ? (
                overview.search.workspaces.map((workspace) => (
                  <div key={workspace.id} className="rounded-[1rem] border border-border bg-white/88 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium">{workspace.name}</p>
                        <p className="text-sm text-muted-foreground">{workspace.ownerEmail}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge className="bg-white text-[hsl(var(--foreground))] shadow-none">{workspace.planCode.toUpperCase()}</Badge>
                        <Badge>{prettify(workspace.billingStatus)}</Badge>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No workspaces matched this query.</p>
              )}
            </div>
          </Card>
        </section>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Conversion Funnel</p>
              <p className="text-sm text-muted-foreground">Track how upgrade intent moves from click to qualified Team demand.</p>
            </div>
            <Badge className="bg-white text-[hsl(var(--foreground))] shadow-none">
              {overview.conversionFunnel.ctaClicks} CTA clicks
            </Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-5">
            {[
              { label: "CTA clicks", value: overview.conversionFunnel.ctaClicks },
              { label: "Pro interest", value: overview.conversionFunnel.proInterestRequests },
              { label: "Team interest", value: overview.conversionFunnel.teamInterestRequests },
              { label: "Team invite", value: overview.conversionFunnel.teamInviteRequests },
              { label: "Pipeline active", value: overview.conversionFunnel.teamPipelineActive }
            ].map((item) => (
              <div key={item.label} className="rounded-[1rem] border border-border bg-white/88 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</p>
                <p className="mt-2 text-2xl font-semibold">{item.value}</p>
              </div>
            ))}
          </div>
          <div className="rounded-[1rem] border border-border bg-white/88 px-4 py-3 text-sm text-muted-foreground">
            Use this sequence to see whether the bottleneck is weak CTA placement, weak interest conversion, or team follow-up friction.
          </div>
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Top Upgrade Sources</p>
              <p className="text-sm text-muted-foreground">See which surfaces are generating the strongest intent signals.</p>
            </div>
            <Badge className="bg-white text-[hsl(var(--foreground))] shadow-none">
              {overview.sourcePerformance.length} active sources
            </Badge>
          </div>
          <div className="space-y-3">
            {overview.sourcePerformance.length ? (
              overview.sourcePerformance.map((source) => (
                <div key={source.source} className="rounded-[1rem] border border-border bg-white/88 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{formatSourceLabel(source.source)}</p>
                    <Badge className="bg-white text-[hsl(var(--foreground))] shadow-none">
                      {source.totalSignals} signals
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge>Clicks: {source.clicks}</Badge>
                    <Badge>Pro: {source.proInterest}</Badge>
                    <Badge>Team: {source.teamInterest}</Badge>
                    <Badge>Invites: {source.teamInvite}</Badge>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No source data has been captured yet.</p>
            )}
          </div>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Conversion Trend By Day</p>
              <p className="text-sm text-muted-foreground">Last 14 days of upgrade intent so we can spot momentum or drop-off early.</p>
            </div>
            <Badge className="bg-white text-[hsl(var(--foreground))] shadow-none">14 day window</Badge>
          </div>
          <div className="space-y-2">
            {overview.conversionTrends.map((trend) => {
              const signalTotal =
                trend.ctaClicks + trend.proInterestRequests + trend.teamInterestRequests + trend.teamInviteRequests;
              return (
                <div
                  key={trend.day}
                  className="grid gap-3 rounded-[1rem] border border-border bg-white/88 px-4 py-3 md:grid-cols-[120px_minmax(0,1fr)] md:items-center"
                >
                  <div>
                    <p className="text-sm font-medium">{new Date(trend.day).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</p>
                    <p className="text-xs text-muted-foreground">{signalTotal} total signals</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge className="bg-white text-[hsl(var(--foreground))] shadow-none">Clicks: {trend.ctaClicks}</Badge>
                    <Badge className="bg-white text-[hsl(var(--foreground))] shadow-none">Pro: {trend.proInterestRequests}</Badge>
                    <Badge className="bg-white text-[hsl(var(--foreground))] shadow-none">Team: {trend.teamInterestRequests}</Badge>
                    <Badge className="bg-white text-[hsl(var(--foreground))] shadow-none">Invites: {trend.teamInviteRequests}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Source To Interest Ratios</p>
              <p className="text-sm text-muted-foreground">Understand which surfaces convert curiosity into stronger upgrade intent.</p>
            </div>
            <Badge className="bg-white text-[hsl(var(--foreground))] shadow-none">
              {overview.sourcePerformance.length} ranked sources
            </Badge>
          </div>
          <div className="space-y-3">
            {overview.sourcePerformance.length ? (
              overview.sourcePerformance.map((source) => (
                <div key={source.source} className="rounded-[1rem] border border-border bg-white/88 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{formatSourceLabel(source.source)}</p>
                      <p className="text-xs text-muted-foreground">{source.clicks} CTA clicks captured</p>
                    </div>
                    <Badge className="bg-white text-[hsl(var(--foreground))] shadow-none">
                      {source.totalSignals} total signals
                    </Badge>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <div className="rounded-[0.9rem] border border-border/80 bg-white px-3 py-2">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Click → Pro</p>
                      <p className={`mt-1 text-xl font-semibold ${ratioTone(source.clickToProRatio)}`}>{source.clickToProRatio}%</p>
                    </div>
                    <div className="rounded-[0.9rem] border border-border/80 bg-white px-3 py-2">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Click → Team</p>
                      <p className={`mt-1 text-xl font-semibold ${ratioTone(source.clickToTeamRatio)}`}>{source.clickToTeamRatio}%</p>
                    </div>
                    <div className="rounded-[0.9rem] border border-border/80 bg-white px-3 py-2">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Click → Invite</p>
                      <p className={`mt-1 text-xl font-semibold ${ratioTone(source.clickToInviteRatio)}`}>{source.clickToInviteRatio}%</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No ratios yet. Once CTA clicks and requests accumulate, this panel will show which surfaces convert best.</p>
            )}
          </div>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Workspace Conversion Leaders</p>
              <p className="text-sm text-muted-foreground">See which specific workspaces are closest to a Pro or Team follow-up.</p>
            </div>
            <Badge className="bg-white text-[hsl(var(--foreground))] shadow-none">
              {overview.workspaceConversionLeaders.length} ranked
            </Badge>
          </div>
          <div className="space-y-3">
            {overview.workspaceConversionLeaders.length ? (
              overview.workspaceConversionLeaders.map((workspace) => (
                <div key={workspace.workspaceId} className="rounded-[1rem] border border-border bg-white/88 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{workspace.workspaceName}</p>
                      <p className="text-sm text-muted-foreground">{workspace.ownerEmail}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-white text-[hsl(var(--foreground))] shadow-none">{workspace.planCode.toUpperCase()}</Badge>
                      <Badge className={trackTone(workspace.recommendedTrack)}>
                        {workspace.recommendedTrack.toUpperCase()} next
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge>Signals: {workspace.totalSignals}</Badge>
                    <Badge>Clicks: {workspace.ctaClicks}</Badge>
                    <Badge>Pro: {workspace.proInterest}</Badge>
                    <Badge>Team: {workspace.teamInterest}</Badge>
                    <Badge>Invites: {workspace.teamInvites}</Badge>
                    {workspace.requestedSeatCount ? <Badge>Seats: {workspace.requestedSeatCount}</Badge> : null}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {workspace.activePipelineStage ? `Pipeline: ${prettify(workspace.activePipelineStage)} · ` : ""}
                    Last signal {formatDateTime(workspace.lastSignalAt)}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No workspace-level conversion leaders yet.</p>
            )}
          </div>
        </Card>

        <Card className="space-y-4">
          <div>
            <p className="text-sm font-semibold">How to Use This Ranking</p>
            <p className="text-sm text-muted-foreground">A simple operator guide so follow-up stays consistent.</p>
          </div>
          <div className="space-y-3">
            {[
              {
                title: "Pro-first workspaces",
                body: "Prioritize workspaces with repeated CTA clicks plus Pro interest when habit pressure and analytics demand are the main signals."
              },
              {
                title: "Team-first workspaces",
                body: "Escalate workspaces that already show Team interest or invite requests. These are better candidates for collaboration rollout than generic pricing outreach."
              },
              {
                title: "Pipeline-assisted follow-up",
                body: "If a workspace already has a pipeline stage, use that stage before opening a fresh conversation. This keeps Team rollout communication clean."
              }
            ].map((item) => (
              <div key={item.title} className="rounded-[1rem] border border-border bg-white/88 px-4 py-3">
                <p className="font-medium">{item.title}</p>
                <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
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
            <p className="text-sm text-muted-foreground">Review signals, leave internal notes, and move each request through follow-up states.</p>
          </div>
          <div className="space-y-3">
            {overview.recentInterestRequests.length ? (
              overview.recentInterestRequests.map((request) => (
                <WorkspaceInterestReviewCard key={request.id} request={request} />
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No upgrade or Team interest requests have been captured yet.</p>
            )}
          </div>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Upgrade Conversion Signals</p>
              <p className="text-sm text-muted-foreground">Measure which upgrade surfaces and tracks generate the strongest intent.</p>
            </div>
            <Badge className="bg-white text-[hsl(var(--foreground))] shadow-none">
              {overview.conversionEvents.total} total events
            </Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-[1rem] border border-border bg-white/88 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">By track</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {Object.entries(overview.conversionEvents.byTrack).length ? (
                  Object.entries(overview.conversionEvents.byTrack).map(([track, count]) => (
                    <Badge key={track} className="bg-white text-[hsl(var(--foreground))] shadow-none">
                      {track.toUpperCase()}: {count}
                    </Badge>
                  ))
                ) : (
                  <Badge className="bg-white text-[hsl(var(--foreground))] shadow-none">No tracked clicks yet</Badge>
                )}
              </div>
            </div>
            <div className="rounded-[1rem] border border-border bg-white/88 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">By event type</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {Object.entries(overview.conversionEvents.byType).length ? (
                  Object.entries(overview.conversionEvents.byType).map(([eventType, count]) => (
                    <Badge key={eventType} className="bg-white text-[hsl(var(--foreground))] shadow-none">
                      {prettify(eventType)}: {count}
                    </Badge>
                  ))
                ) : (
                  <Badge className="bg-white text-[hsl(var(--foreground))] shadow-none">Waiting for signal data</Badge>
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card className="space-y-4">
          <div>
            <p className="text-sm font-semibold">Recent Conversion Events</p>
            <p className="text-sm text-muted-foreground">See which workspace, source, and track triggered recent upgrade intent.</p>
          </div>
          <div className="space-y-3">
            {overview.recentConversionEvents.length ? (
              overview.recentConversionEvents.map((event) => (
                <div key={event.id} className="rounded-[1rem] border border-border bg-white/88 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{event.workspaceName}</p>
                      <p className="text-sm text-muted-foreground">{event.userName} · {event.userEmail}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-white text-[hsl(var(--foreground))] shadow-none">{prettify(event.eventType)}</Badge>
                      {event.recommendedTrack ? <Badge>{event.recommendedTrack.toUpperCase()}</Badge> : null}
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Source: {event.source}
                    {event.activeState ? ` · State: ${prettify(event.activeState)}` : ""}
                    {event.targetHref ? ` · Target: ${event.targetHref}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(event.createdAt)}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No upgrade conversion events have been captured yet.</p>
            )}
          </div>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Team Invite Pipeline</p>
              <p className="text-sm text-muted-foreground">Track structured requests for seats, invite targets, and rollout preparation.</p>
            </div>
            <Badge className="bg-white text-[hsl(var(--foreground))] shadow-none">
              {overview.inviteRequests.pending} pending · {overview.inviteRequests.total} total
            </Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-[1rem] border border-border bg-white/88 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Pending invite requests</p>
              <p className="mt-2 text-2xl font-semibold">{overview.inviteRequests.pending}</p>
            </div>
            <div className="rounded-[1rem] border border-border bg-white/88 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Total invite requests</p>
              <p className="mt-2 text-2xl font-semibold">{overview.inviteRequests.total}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(overview.inviteRequests.byStatus).length ? (
              Object.entries(overview.inviteRequests.byStatus).map(([status, count]) => (
                <Badge key={status} className="bg-white text-[hsl(var(--foreground))] shadow-none">
                  {prettify(status)}: {count}
                </Badge>
              ))
            ) : (
              <Badge className="bg-white text-[hsl(var(--foreground))] shadow-none">No pipeline states yet</Badge>
            )}
          </div>
        </Card>

        <Card className="space-y-4">
          <div>
            <p className="text-sm font-semibold">Recent Team Invite Requests</p>
            <p className="text-sm text-muted-foreground">Review seat counts, target emails, and internal notes before Team invites go live.</p>
          </div>
          <div className="space-y-3">
            {overview.recentInviteRequests.length ? (
              overview.recentInviteRequests.map((request) => (
                <TeamInviteRequestReviewCard key={request.id} request={request} />
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No Team invite requests have been captured yet.</p>
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
