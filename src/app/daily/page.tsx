import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { todayInTimezone } from "@/lib/date";
import { DailyPlannerClient } from "@/components/daily/daily-planner";

export default async function DailyPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const initialLayout = Array.isArray(user.dailyLayout)
    ? user.dailyLayout.filter((item): item is string => typeof item === "string")
    : [];

  return <DailyPlannerClient initialDate={todayInTimezone(user.timezone)} initialLayout={initialLayout} />;
}
