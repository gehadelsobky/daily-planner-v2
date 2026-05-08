import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";

export default async function HomePage() {
  const user = await getSessionUser();
  if (user) {
    redirect("/daily");
  }

  return (
    <main className="bg-[radial-gradient(circle_at_top_left,rgba(0,176,255,0.10),transparent_30%),radial-gradient(circle_at_top_right,rgba(31,217,181,0.10),transparent_26%),linear-gradient(180deg,#f8fbff_0%,#ffffff_38%,#f6f9ff_100%)]">
      <section className="mx-auto flex w-full max-w-[1280px] flex-col gap-14 px-4 pb-20 pt-16 lg:px-6">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="space-y-8">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-[rgba(23,69,199,0.10)] px-4 py-2 text-sm font-semibold text-[#1745C7]">
                SaaS-ready productivity system
              </span>
              <span className="rounded-full bg-[rgba(31,217,181,0.16)] px-4 py-2 text-sm font-semibold text-[#0a0087]">
                Free plan live now
              </span>
            </div>
            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-[hsl(var(--muted-foreground))]">
                Built for clarity, consistency, and growth
              </p>
              <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-[hsl(var(--foreground))] md:text-6xl">
                Plan each day with structure, see your score clearly, and grow habits that actually stick.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-[hsl(var(--muted-foreground))]">
                Daily Planner brings your tasks, habits, reflection, hydration, exercise, and momentum into one
                workspace. Start free today, with a clean path toward Pro insights and Team workspaces later.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-full bg-[#1745C7] px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_38px_rgba(23,69,199,0.24)] transition hover:bg-[#0a0087]"
              >
                Start Free
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded-full border border-[hsl(var(--border))] bg-white px-6 py-3 text-sm font-semibold text-[hsl(var(--foreground))] shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition hover:border-[#00b0ff] hover:text-[#1745C7]"
              >
                See plans
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-[1.5rem] border border-[hsl(var(--border)/0.75)] bg-white/90 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
                <p className="text-sm uppercase tracking-[0.25em] text-[hsl(var(--muted-foreground))]">Daily rhythm</p>
                <p className="mt-3 text-3xl font-semibold text-[hsl(var(--foreground))]">Tasks + Habits</p>
                <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                  Keep execution and consistency in one workspace instead of scattered tools.
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-[hsl(var(--border)/0.75)] bg-white/90 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
                <p className="text-sm uppercase tracking-[0.25em] text-[hsl(var(--muted-foreground))]">Visible progress</p>
                <p className="mt-3 text-3xl font-semibold text-[hsl(var(--foreground))]">Daily Score</p>
                <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                  Track how your day is going with transparent scoring across your core routines.
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-[hsl(var(--border)/0.75)] bg-white/90 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
                <p className="text-sm uppercase tracking-[0.25em] text-[hsl(var(--muted-foreground))]">Ready to grow</p>
                <p className="mt-3 text-3xl font-semibold text-[hsl(var(--foreground))]">SaaS foundation</p>
                <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                  Personal workspaces are live now, with Pro and Team architecture already in motion.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-[hsl(var(--border)/0.75)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,251,255,0.96))] p-6 shadow-[0_28px_70px_rgba(15,23,42,0.10)]">
            <div className="rounded-[1.5rem] border border-[hsl(var(--border)/0.75)] bg-white/95 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.25em] text-[hsl(var(--muted-foreground))]">Today at a glance</p>
                  <h2 className="mt-2 text-2xl font-semibold text-[hsl(var(--foreground))]">A cleaner daily operating system</h2>
                </div>
                <span className="rounded-full bg-[rgba(0,176,255,0.14)] px-4 py-2 text-sm font-semibold text-[#1745C7]">
                  Free
                </span>
              </div>
              <div className="mt-6 space-y-4">
                {[
                  {
                    title: "Capture priorities fast",
                    body: "Tasks, For Tomorrow, and Notes keep execution and carryover visible."
                  },
                  {
                    title: "Score the day transparently",
                    body: "Daily Score shows exactly where progress is strong and where consistency is slipping."
                  },
                  {
                    title: "Build durable routines",
                    body: "Habits, water, exercise, gratitude, and growth entries make reflection part of the flow."
                  }
                ].map((item) => (
                  <div key={item.title} className="rounded-[1.25rem] border border-[hsl(var(--border)/0.75)] bg-[rgba(248,251,255,0.92)] p-4">
                    <p className="font-semibold text-[hsl(var(--foreground))]">{item.title}</p>
                    <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{item.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <section className="grid gap-6 lg:grid-cols-3">
          {[
            {
              title: "Morning clarity",
              body: "Open the day with a focused task list, visible carryover, and the habits that matter most."
            },
            {
              title: "Midday correction",
              body: "See your score, hydration, and habit progress while there is still time to recover the day."
            },
            {
              title: "Evening reflection",
              body: "Close the loop with growth, gratitude, wins, notes, and a better handoff to tomorrow."
            }
          ].map((feature) => (
            <article
              key={feature.title}
              className="rounded-[1.75rem] border border-[hsl(var(--border)/0.75)] bg-white/95 p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#1745C7]">{feature.title}</p>
              <p className="mt-4 text-base leading-7 text-[hsl(var(--muted-foreground))]">{feature.body}</p>
            </article>
          ))}
        </section>

        <section className="rounded-[2rem] border border-[hsl(var(--border)/0.75)] bg-[linear-gradient(135deg,rgba(23,69,199,0.94),rgba(10,0,135,0.96))] p-8 text-white shadow-[0_28px_70px_rgba(10,0,135,0.24)] lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-white/70">What comes next</p>
              <h2 className="mt-4 text-3xl font-semibold leading-tight lg:text-4xl">
                Launch on Free now, then grow into Pro insights and Team workspaces without rebuilding the product.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-white/78">
                We have already laid the SaaS foundation: personal workspaces, plan-aware entitlements, onboarding
                activation, and admin visibility. The next commercial layers can ship on top of that base cleanly.
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-white/15 bg-white/10 p-6 backdrop-blur">
              <p className="text-sm uppercase tracking-[0.25em] text-white/70">Start here</p>
              <div className="mt-5 space-y-3 text-sm text-white/85">
                <p>1. Create your free workspace.</p>
                <p>2. Configure your profile and first habits.</p>
                <p>3. Close your first complete day.</p>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#0a0087] transition hover:bg-white/90"
                >
                  Create free account
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-full border border-white/30 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
