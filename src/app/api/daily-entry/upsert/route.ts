import { requireUser } from "@/lib/auth/guard";
import { parseJson } from "@/lib/http";
import { dailyEntryUpsertSchema } from "@/lib/validation/schemas";
import { prisma } from "@/lib/db";
import { toDateOnlyUtc } from "@/lib/date";
import { rejectIfDayClosed } from "@/lib/daily/locks";
import { requireCurrentWorkspace } from "@/lib/saas/workspace-context";

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const parsed = await parseJson(req, dailyEntryUpsertSchema);
  if (!parsed.ok) return parsed.response;

  const date = toDateOnlyUtc(parsed.data.date, auth.user.timezone);
  const workspace = await requireCurrentWorkspace(auth.user.id);
  const closedResponse = await rejectIfDayClosed(auth.user.id, date, workspace.id);
  if (closedResponse) return closedResponse;

  const entry = await prisma.dailyEntry.upsert({
    where: { userId_date: { userId: auth.user.id, date } },
    create: {
      userId: auth.user.id,
      workspaceId: workspace.id,
      date,
      growText: parsed.data.grow_text,
      notesText: parsed.data.notes_text,
      tomorrowItems: parsed.data.tomorrow_items,
      topWinsItems: parsed.data.top_wins_items,
      quoteItems: parsed.data.quote_items
    },
    update: {
      workspaceId: workspace.id,
      growText: parsed.data.grow_text,
      notesText: parsed.data.notes_text,
      tomorrowItems: parsed.data.tomorrow_items,
      topWinsItems: parsed.data.top_wins_items,
      quoteItems: parsed.data.quote_items
    }
  });

  return Response.json({ entry });
}
