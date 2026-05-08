import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { todayInTimezone } from "@/lib/date";
import { DailyPlannerClient } from "@/components/daily/daily-planner";

export default async function DailyPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const resolvedSearchParams = (await searchParams) ?? {};
  const welcomeParam = resolvedSearchParams.welcome;
  const showWelcomeActivation = Array.isArray(welcomeParam)
    ? welcomeParam.includes("1")
    : welcomeParam === "1";

  const initialLayout = Array.isArray(user.dailyLayout)
    ? user.dailyLayout.filter((item): item is string => typeof item === "string")
    : [];

  return (
    <DailyPlannerClient
      initialDate={todayInTimezone(user.timezone)}
      initialLayout={initialLayout}
      showWelcomeActivation={showWelcomeActivation}
    />
  );
}
