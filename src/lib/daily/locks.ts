import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function getClosedEntry(userId: string, date: Date) {
  return prisma.dailyEntry.findUnique({
    where: { userId_date: { userId, date } },
    select: { id: true, closedAt: true }
  });
}

export async function rejectIfDayClosed(userId: string, date: Date) {
  const entry = await getClosedEntry(userId, date);
  if (entry?.closedAt) {
    return NextResponse.json(
      { error: "This day is closed and can no longer be edited." },
      { status: 409 }
    );
  }

  return null;
}
