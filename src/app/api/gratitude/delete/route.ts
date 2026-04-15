import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guard";
import { parseJson } from "@/lib/http";
import { gratitudeDeleteSchema, gratitudeUpdateSchema } from "@/lib/validation/schemas";
import { prisma } from "@/lib/db";

export async function PATCH(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const parsed = await parseJson(req, gratitudeUpdateSchema);
  if (!parsed.ok) return parsed.response;

  const item = await prisma.gratitudeItem.findUnique({
    where: { id: parsed.data.item_id },
    include: { dailyEntry: true }
  });

  if (!item || item.dailyEntry.userId !== auth.user.id) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }
  if (item.dailyEntry.closedAt) {
    return NextResponse.json({ error: "This day is closed and can no longer be edited." }, { status: 409 });
  }

  const updated = await prisma.gratitudeItem.update({
    where: { id: item.id },
    data: { text: parsed.data.text.trim() }
  });

  return Response.json({ item: updated });
}

export async function DELETE(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const parsed = await parseJson(req, gratitudeDeleteSchema);
  if (!parsed.ok) return parsed.response;

  const item = await prisma.gratitudeItem.findUnique({
    where: { id: parsed.data.item_id },
    include: { dailyEntry: true }
  });

  if (!item || item.dailyEntry.userId !== auth.user.id) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }
  if (item.dailyEntry.closedAt) {
    return NextResponse.json({ error: "This day is closed and can no longer be edited." }, { status: 409 });
  }

  await prisma.gratitudeItem.delete({ where: { id: item.id } });
  return Response.json({ success: true });
}
