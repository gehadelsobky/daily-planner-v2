import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";

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
  const teamInterestHref =
    "mailto:hello@gehadelsobky.com?subject=Daily%20Planner%20Team%20interest&body=We%20want%20to%20use%20Daily%20Planner%20as%20a%20shared%20team%20workspace.%0A%0APlease%20share%20the%20next%20step%20for%20Team%20access.";
  const proWaitlistHref =
    "mailto:hello@gehadelsobky.com?subject=Daily%20Planner%20Pro%20waitlist&body=I%20want%20to%20join%20the%20Daily%20Planner%20Pro%20waitlist.%0A%0APlease%20tell%20me%20when%20advanced%20analytics%2C%20exports%2C%20and%20email%20reminders%20are%20ready.";

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
        </div>

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
              <Link
                href={proWaitlistHref}
                className="inline-flex items-center justify-center rounded-full bg-[#1745C7] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_38px_rgba(23,69,199,0.22)] transition hover:bg-[#0a0087]"
              >
                Join Pro waitlist
              </Link>
              <Link
                href={user ? "/settings" : "/register"}
                className="inline-flex items-center justify-center rounded-full border border-[hsl(var(--border))] bg-white px-5 py-3 text-sm font-semibold text-[hsl(var(--foreground))] transition hover:border-[#00b0ff] hover:text-[#1745C7]"
              >
                {user ? "Review your current plan" : "Create a free workspace"}
              </Link>
            </div>
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
              <Link
                href={teamInterestHref}
                className="inline-flex items-center justify-center rounded-full bg-[#1745C7] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_38px_rgba(23,69,199,0.22)] transition hover:bg-[#0a0087]"
              >
                Request Team access
              </Link>
              <Link
                href={user ? "/settings" : "/login"}
                className="inline-flex items-center justify-center rounded-full border border-[hsl(var(--border))] bg-white px-5 py-3 text-sm font-semibold text-[hsl(var(--foreground))] transition hover:border-[#00b0ff] hover:text-[#1745C7]"
              >
                {user ? "Open workspace settings" : "Sign in to your workspace"}
              </Link>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
