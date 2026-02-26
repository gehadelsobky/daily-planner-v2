import { NextResponse } from "next/server";
import { runAllUsersForTimezoneFallback } from "@/lib/jobs/for-tomorrow";

export async function POST(req: Request) {
  const token = req.headers.get("x-cron-token");
  if (!process.env.CRON_SECRET || token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await runAllUsersForTimezoneFallback();
  return NextResponse.json({ ok: true, results });
}
