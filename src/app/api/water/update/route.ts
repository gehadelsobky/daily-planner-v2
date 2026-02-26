import { requireUser } from "@/lib/auth/guard";
import { parseJson } from "@/lib/http";
import { waterUpdateSchema } from "@/lib/validation/schemas";
import { prisma } from "@/lib/db";
import { toDateOnlyUtc } from "@/lib/date";

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const parsed = await parseJson(req, waterUpdateSchema);
  if (!parsed.ok) return parsed.response;

  const date = toDateOnlyUtc(parsed.data.date, auth.user.timezone);
  const entry = await prisma.dailyEntry.upsert({
    where: { userId_date: { userId: auth.user.id, date } },
    create: { userId: auth.user.id, date },
    update: {}
  });

  const log = await prisma.waterLog.upsert({
    where: { dailyEntryId: entry.id },
    create: {
      dailyEntryId: entry.id,
      consumed: parsed.data.consumed,
      target: parsed.data.target,
      unit: parsed.data.unit ?? auth.user.waterDefaultUnit
    },
    update: {
      consumed: parsed.data.consumed,
      target: parsed.data.target,
      unit: parsed.data.unit
    }
  });

  return Response.json({ log });
}
