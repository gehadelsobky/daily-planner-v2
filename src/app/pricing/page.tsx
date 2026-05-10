import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getWorkspaceUsageSnapshot } from "@/lib/saas/feature-usage";
import { getCurrentWorkspaceContextForUser } from "@/lib/saas/workspace-runtime";
import { getLockedFeatureStatuses } from "@/lib/saas/plans";
import { getUpgradeSignalSummary } from "@/lib/saas/upgrade-signals";
import { InterestRequestButton } from "@/components/saas/interest-request-button";
import { TeamInviteRequestForm } from "@/components/saas/team-invite-request-form";
import { TrackedUpgradeLink } from "@/components/saas/tracked-upgrade-link";

const plans = [
  {
    name: "Free",
    badge: "Live now",
    price: "$0",
    cadence: "/month",
    description: "For individuals who want a complete daily planning system before upgrading to deeper insight.",
    features: [
      "1 personal workspace",
      "Up to 10 habits",
      "Daily planner core",
      "Basic dashboard and score history",
      "In-app reminders and notifications"
    ],
    cta: "Start free",
    href: "/register",
    highlight: true
  },
  {
    name: "Pro",
    badge: "Coming next",
    price: "Soon",
    cadence: "",
    description: "For serious individual operators who want stronger reflection loops, exports, and richer analytics.",
    features: [
      "Unlimited habits",
      "Advanced analytics",
      "Monthly review",
      "Email reminders",
      "Data exports"
    ],
    cta: "Join waitlist",
    href: "mailto:hello@gehadelsobky.com?subject=Daily%20Planner%20Pro%20waitlist",
    highlight: false
  },
  {
    name: "Team",
    badge: "Workspace-ready",
    price: "Soon",
    cadence: "",
    description: "For collaborative workspaces that need shared visibility, invites, and team accountability.",
    features: [
      "Shared workspace",
      "Member roles and invites",
      "Team reporting",
      "Shared challenges",
      "Operational admin visibility"
    ],
    cta: "Talk to us",
    href: "mailto:hello@gehadelsobky.com?subject=Daily%20Planner%20Team%20interest",
    highlight: false
  }
] as const;

export default async function PricingPage() {
  const user = await getSessionUser();
  const workspaceContext = user ? await getCurrentWorkspaceContextForUser(user) : null;
  const interestRequests = workspaceContext
    ? await prisma.workspaceInterest.findMany({
        where: { workspaceId: workspaceContext.workspace.id },
        select: {
          type: true,
          status: true,
          requestCount: true,
          updatedAt: true
        }
      })
    : [];
  const inviteRequest = workspaceContext
    ? await prisma.workspaceInviteRequest.findUnique({
        where: { workspaceId: workspaceContext.workspace.id },
        select: {
          id: true,
          status: true,
          pipelineStage: true,
          requestCount: true,
          requestedSeatCount: true,
          inviteEmails: true,
          message: true,
          updatedAt: true
        }
      })
    : null;
  const workspaceUsage = workspaceContext ? await getWorkspaceUsageSnapshot(workspaceContext.workspace.id) : null;
  const proInterestRequest = interestRequests.find((request) => request.type === "pro");
  const teamInterestRequest = interestRequests.find((request) => request.type === "team");
  const upgradeSignals = workspaceContext && workspaceUsage
    ? getUpgradeSignalSummary({
        planCode: workspaceContext.planCode,
        usage: workspaceUsage,
        entitlements: workspaceContext.entitlements,
        lockedFeatures: getLockedFeatureStatuses(workspaceContext.entitlements),
        interestRequests: interestRequests.map((request) => ({
          type: request.type,
          status: request.status,
          requestCount: request.requestCount,
          updatedAt: request.updatedAt.toISOString()
        })),
        inviteRequest: inviteRequest
          ? {
              status: inviteRequest.status,
              pipelineStage: inviteRequest.pipelineStage,
              requestCount: inviteRequest.requestCount,
              requestedSeatCount: inviteRequest.requestedSeatCount,
              inviteEmails: Array.isArray(inviteRequest.inviteEmails)
                ? inviteRequest.inviteEmails.filter((item): item is string => typeof item === "string")
                : [],
              updatedAt: inviteRequest.updatedAt.toISOString()
            }
          : null
      })
    : null;

  return (
    <main className="bg-[radial-gradient(circle_at_top_left,rgba(0,176,255,0.10),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(31,217,181,0.12),transparent_30%),linear-gradient(180deg,#f8fbff_0%,#ffffff_36%,#f6f9ff_100%)]">
      <section className="mx-auto flex w-full max-w-[1280px] flex-col gap-12 px-4 pb-20 pt-16 lg:px-6">
        <div className="space-y-5 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-[hsl(var(--muted-foreground))]">
            Pricing
          </p>
          <h1 className="text-4xl font-semibold leading-tight text-[hsl(var(--foreground))] md:text-5xl">
            Start free today, then unlock deeper insight as your workspace grows.
          </h1>
          <p className="mx-auto max-w-3xl text-lg leading-8 text-[hsl(var(--muted-foreground))]">
            The product is live on Free now. Pro and Team are already reflected in the SaaS foundation so future upgrades
            can arrive cleanly without reworking your workflow.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <span className="rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-[#1745C7] shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
              No card required
            </span>
            <span className="rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-[#0a0087] shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
              Free workspace live now
            </span>
            <span className="rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-[#0a0087] shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
              Pro and Team shaped from real usage
            </span>
          </div>
        </div>

        {user && workspaceContext && upgradeSignals ? (
          <section className="rounded-[2rem] border border-[rgba(0,176,255,0.22)] bg-[linear-gradient(135deg,rgba(23,69,199,0.10),rgba(0,176,255,0.08),rgba(31,217,181,0.10))] p-7 shadow-[0_22px_54px_rgba(15,23,42,0.08)]">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[rgba(0,176,255,0.14)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#1745C7]">
                    {workspaceContext.planCode.toUpperCase()} workspace
                  </span>
                  <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[hsl(var(--foreground))]">
                    Recommended next: {upgradeSignals.recommendedTrack.toUpperCase()}
                  </span>
                  <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-[hsl(var(--foreground))]">
                    {upgradeSignals.contextLabel}
                  </span>
                  <span className="rounded-full bg-[rgba(31,217,181,0.14)] px-3 py-1 text-xs font-semibold text-[#0a0087]">
                    {upgradeSignals.urgencyLabel}
                  </span>
                </div>
                <div>
                  <h2 className="text-3xl font-semibold leading-tight text-[hsl(var(--foreground))]">
                    {upgradeSignals.headline}
                  </h2>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-[hsl(var(--muted-foreground))]">
                    {upgradeSignals.description}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 lg:justify-end">
                <TrackedUpgradeLink
                  href={upgradeSignals.primaryActionHref}
                  source="pricing-upgrade-banner-primary"
                  recommendedTrack={upgradeSignals.recommendedTrack}
                  activeState={upgradeSignals.activeState}
                  className="inline-flex items-center justify-center rounded-full bg-[#1745C7] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_38px_rgba(23,69,199,0.22)] transition hover:bg-[#0a0087]"
                >
                  {upgradeSignals.primaryActionLabel}
                </TrackedUpgradeLink>
                <TrackedUpgradeLink
                  href={upgradeSignals.secondaryActionHref}
                  source="pricing-upgrade-banner-secondary"
                  recommendedTrack={upgradeSignals.recommendedTrack}
                  activeState={upgradeSignals.activeState}
                  className="inline-flex items-center justify-center rounded-full border border-[hsl(var(--border))] bg-white px-5 py-3 text-sm font-semibold text-[hsl(var(--foreground))] transition hover:border-[#00b0ff] hover:text-[#1745C7]"
                >
                  {upgradeSignals.secondaryActionLabel}
                </TrackedUpgradeLink>
              </div>
            </div>
          </section>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`flex h-full flex-col rounded-[2rem] border p-7 shadow-[0_20px_50px_rgba(15,23,42,0.08)] ${plan.highlight ? "border-[#00b0ff] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(243,249,255,0.96))]" : "border-[hsl(var(--border)/0.75)] bg-white/95"}`}
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-2xl font-semibold text-[hsl(var(--foreground))]">{plan.name}</h2>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${plan.highlight ? "bg-[rgba(0,176,255,0.14)] text-[#1745C7]" : "bg-[rgba(31,217,181,0.14)] text-[#0a0087]"}`}
                >
                  {plan.badge}
                </span>
              </div>
              <p className="mt-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]">{plan.description}</p>
              <div className="mt-6 flex items-end gap-1">
                <span className="text-4xl font-semibold text-[hsl(var(--foreground))]">{plan.price}</span>
                {plan.cadence ? <span className="pb-1 text-sm text-[hsl(var(--muted-foreground))]">{plan.cadence}</span> : null}
              </div>
              <div className="mt-8 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <div key={feature} className="rounded-[1rem] border border-[hsl(var(--border)/0.7)] bg-[rgba(248,251,255,0.88)] px-4 py-3 text-sm text-[hsl(var(--foreground))]">
                    {feature}
                  </div>
                ))}
              </div>
              <Link
                href={plan.href}
                className={`mt-8 inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition ${plan.highlight ? "bg-[#1745C7] text-white shadow-[0_18px_38px_rgba(23,69,199,0.22)] hover:bg-[#0a0087]" : "border border-[hsl(var(--border))] bg-white text-[hsl(var(--foreground))] hover:border-[#00b0ff] hover:text-[#1745C7]"}`}
              >
                {plan.cta}
              </Link>
            </article>
          ))}
        </div>

        <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-[2rem] border border-[hsl(var(--border)/0.75)] bg-white/95 p-7 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#1745C7]">What is already live</p>
            <ul className="mt-5 space-y-3 text-sm leading-7 text-[hsl(var(--muted-foreground))]">
              <li>Full daily planning workflow with tasks, habits, water, gratitude, growth, notes, and quotes.</li>
              <li>Transparent daily score with configurable weights.</li>
              <li>Gamification, onboarding activation, account lifecycle tracking, and SaaS-aware entitlements foundation.</li>
              <li>Admin overview baseline and production-ready forgot password flow.</li>
            </ul>
          </div>
          <div className="rounded-[2rem] border border-[hsl(var(--border)/0.75)] bg-[linear-gradient(135deg,rgba(23,69,199,0.96),rgba(10,0,135,0.98))] p-7 text-white shadow-[0_24px_60px_rgba(10,0,135,0.24)]">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-white/70">Best next step</p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight">
              Use the Free workspace now and let your real workflow shape the next commercial layer.
            </h2>
            <p className="mt-4 text-sm leading-7 text-white/80">
              This product is being built with a clean evolution path: individual users today, deeper Pro insight next,
              then collaborative Team workspaces without breaking the core experience.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={user ? "/daily" : "/register"}
                className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#0a0087] transition hover:bg-white/90"
              >
                {user ? "Open workspace" : "Create free account"}
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full border border-white/30 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Sign in
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          {[
            {
              title: "Stay on Free while the core matures",
              body: "Use the full planning system now. The product is already useful without needing a billing step or a plan decision upfront."
            },
            {
              title: "Move to Pro when insight becomes the bottleneck",
              body: "If habits, analytics, monthly review, and exports become the next constraint, Pro is the clean individual upgrade path."
            },
            {
              title: "Move to Team when collaboration becomes real",
              body: "When you know who needs access and how many seats you need, Team requests and invite planning are already built into the product."
            }
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-[1.75rem] border border-[hsl(var(--border)/0.75)] bg-white/95 p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#1745C7]">{item.title}</p>
              <p className="mt-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]">{item.body}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[2rem] border border-[hsl(var(--border)/0.75)] bg-white/95 p-7 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#1745C7]">Pro waitlist</p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight text-[hsl(var(--foreground))]">
              Ask for deeper insight before paid activation goes live.
            </h2>
            <p className="mt-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]">
              If you already know you need stronger analytics, exports, and email reminders, join the Pro waitlist now.
              This helps shape the next rollout around real usage rather than guesses.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {user ? (
                <InterestRequestButton
                  interestType="pro"
                  source="pricing-pro-interest"
                  label="Join Pro waitlist"
                  requestedLabel="Pro request saved"
                  className="rounded-full px-5 py-3"
                  initialRequested={Boolean(proInterestRequest)}
                />
              ) : (
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center rounded-full bg-[#1745C7] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_38px_rgba(23,69,199,0.22)] transition hover:bg-[#0a0087]"
                >
                  Join Pro waitlist
                </Link>
              )}
              <Link
                href={user ? "/settings" : "/register"}
                className="inline-flex items-center justify-center rounded-full border border-[hsl(var(--border))] bg-white px-5 py-3 text-sm font-semibold text-[hsl(var(--foreground))] transition hover:border-[#00b0ff] hover:text-[#1745C7]"
              >
                {user ? "Review your current plan" : "Create a free workspace"}
              </Link>
            </div>
            {proInterestRequest ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Pro interest saved {proInterestRequest.requestCount} time{proInterestRequest.requestCount === 1 ? "" : "s"}.
                Last updated {new Date(proInterestRequest.updatedAt).toLocaleDateString()}.
              </p>
            ) : null}
          </div>

          <div className="rounded-[2rem] border border-[rgba(0,176,255,0.22)] bg-[linear-gradient(135deg,rgba(23,69,199,0.08),rgba(0,176,255,0.10),rgba(31,217,181,0.08))] p-7 shadow-[0_22px_54px_rgba(15,23,42,0.08)]">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#1745C7]">Team interest</p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight text-[hsl(var(--foreground))]">
              Signal when your workspace is ready for shared planning.
            </h2>
            <p className="mt-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]">
              Team is designed for shared visibility, member roles, invites, and stronger accountability. If you already
              plan to collaborate with others, send a Team interest request and we will use that signal to shape the
              rollout priority.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.25rem] border border-white/80 bg-white/90 px-4 py-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Best fit</p>
                <p className="mt-2 text-sm font-semibold text-[hsl(var(--foreground))]">Founders, ops teams, and shared execution groups</p>
              </div>
              <div className="rounded-[1.25rem] border border-white/80 bg-white/90 px-4 py-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Unlocks</p>
                <p className="mt-2 text-sm font-semibold text-[hsl(var(--foreground))]">Invites, roles, team reporting, and collaboration</p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              {user ? (
                <InterestRequestButton
                  interestType="team"
                  source="pricing-team-interest"
                  label="Request Team access"
                  requestedLabel="Team request saved"
                  className="rounded-full px-5 py-3"
                  initialRequested={Boolean(teamInterestRequest)}
                />
              ) : (
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center rounded-full bg-[#1745C7] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_38px_rgba(23,69,199,0.22)] transition hover:bg-[#0a0087]"
                >
                  Request Team access
                </Link>
              )}
              <Link
                href={user ? "/settings" : "/login"}
                className="inline-flex items-center justify-center rounded-full border border-[hsl(var(--border))] bg-white px-5 py-3 text-sm font-semibold text-[hsl(var(--foreground))] transition hover:border-[#00b0ff] hover:text-[#1745C7]"
              >
                {user ? "Open workspace settings" : "Sign in to your workspace"}
              </Link>
            </div>
            {teamInterestRequest ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Team interest saved {teamInterestRequest.requestCount} time{teamInterestRequest.requestCount === 1 ? "" : "s"}.
                Last updated {new Date(teamInterestRequest.updatedAt).toLocaleDateString()}.
              </p>
            ) : null}
            {user ? (
              <div className="mt-5">
                <TeamInviteRequestForm
                  source="pricing-team-invite-request"
                  compact
                  initialRequest={
                    inviteRequest
                      ? {
                          ...inviteRequest,
                          inviteEmails: Array.isArray(inviteRequest.inviteEmails)
                            ? inviteRequest.inviteEmails.filter((item): item is string => typeof item === "string")
                            : [],
                          message: inviteRequest.message,
                          updatedAt: inviteRequest.updatedAt.toISOString()
                        }
                      : null
                  }
                />
              </div>
            ) : null}
          </div>
        </section>
      </section>
    </main>
  );
}
