import { requireUser } from "@/lib/auth/guard";
import { parseJson } from "@/lib/http";
import { gratitudeAddSchema } from "@/lib/validation/schemas";
import { prisma } from "@/lib/db";
import { toDateOnlyUtc } from "@/lib/date";

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const parsed = await parseJson(req, gratitudeAddSchema);
  if (!parsed.ok) return parsed.response;

  const date = toDateOnlyUtc(parsed.data.date, auth.user.timezone);
  const entry = await prisma.dailyEntry.upsert({
    where: { userId_date: { userId: auth.user.id, date } },
    create: { userId: auth.user.id, date },
    update: {}
  });

  const item = await prisma.gratitudeItem.create({
    data: {
      dailyEntryId: entry.id,
      text: parsed.data.text
    }
  });

  return Response.json({ item });
}
