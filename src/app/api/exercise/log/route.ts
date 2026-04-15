import { requireUser } from "@/lib/auth/guard";
import { parseJson } from "@/lib/http";
import { exerciseLogSchema } from "@/lib/validation/schemas";
import { prisma } from "@/lib/db";
import { toDateOnlyUtc } from "@/lib/date";
import { rejectIfDayClosed } from "@/lib/daily/locks";

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const parsed = await parseJson(req, exerciseLogSchema);
  if (!parsed.ok) return parsed.response;

  const date = toDateOnlyUtc(parsed.data.date, auth.user.timezone);
  const closedResponse = await rejectIfDayClosed(auth.user.id, date);
  if (closedResponse) return closedResponse;

  const entry = await prisma.dailyEntry.upsert({
    where: { userId_date: { userId: auth.user.id, date } },
    create: { userId: auth.user.id, date },
    update: {}
  });

  const log = await prisma.exerciseLog.create({
    data: {
      dailyEntryId: entry.id,
      type: parsed.data.type,
      minutes: parsed.data.minutes,
      intensity: parsed.data.intensity
    }
  });

  return Response.json({ log });
}
