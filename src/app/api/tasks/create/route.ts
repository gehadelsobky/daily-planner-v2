import { requireUser } from "@/lib/auth/guard";
import { parseJson } from "@/lib/http";
import { createTaskSchema } from "@/lib/validation/schemas";
import { prisma } from "@/lib/db";
import { toDateOnlyUtc } from "@/lib/date";

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const parsed = await parseJson(req, createTaskSchema);
  if (!parsed.ok) return parsed.response;

  const date = toDateOnlyUtc(parsed.data.date, auth.user.timezone);
  const entry = await prisma.dailyEntry.upsert({
    where: { userId_date: { userId: auth.user.id, date } },
    create: { userId: auth.user.id, date },
    update: {}
  });

  const task = await prisma.task.create({
    data: {
      dailyEntryId: entry.id,
      title: parsed.data.title,
      priority: parsed.data.priority,
      category: parsed.data.category,
      sortOrder: parsed.data.sort_order
    }
  });

  return Response.json({ task });
}
