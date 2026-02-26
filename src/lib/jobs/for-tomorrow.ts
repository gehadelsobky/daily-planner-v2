import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatDateInTimezone, toDateOnlyUtc } from "@/lib/date";

function getYesterday(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function normalizeTomorrowItems(value: Prisma.JsonValue): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
}

export async function runForTomorrowMigration(userId: string, todayDateString: string, timezone: string) {
  const yesterdayDate = getYesterday(todayDateString);
  const yesterdayUtc = toDateOnlyUtc(yesterdayDate, timezone);
  const todayUtc = toDateOnlyUtc(todayDateString, timezone);

  return prisma.$transaction(async (tx) => {
    const yesterdayEntry = await tx.dailyEntry.findUnique({
      where: {
        userId_date: {
          userId,
          date: yesterdayUtc
        }
      },
      include: {
        tasks: true
      }
    });

    if (!yesterdayEntry) {
      return { moved: 0, skipped: 0 };
    }

    const tomorrowItems = normalizeTomorrowItems(yesterdayEntry.tomorrowItems);
    if (tomorrowItems.length === 0) {
      return { moved: 0, skipped: 0 };
    }

    const todayEntry = await tx.dailyEntry.upsert({
      where: {
        userId_date: {
          userId,
          date: todayUtc
        }
      },
      create: {
        userId,
        date: todayUtc
      },
      update: {},
      include: {
        tasks: true
      }
    });

    const existingTitles = new Set(todayEntry.tasks.map((task) => task.title.trim().toLowerCase()));

    let maxSortOrder = todayEntry.tasks.reduce((max, task) => Math.max(max, task.sortOrder), 0);
    let moved = 0;
    let skipped = 0;

    for (const title of tomorrowItems) {
      const normalized = title.toLowerCase();
      if (existingTitles.has(normalized)) {
        skipped += 1;
        continue;
      }

      maxSortOrder += 1;
      await tx.task.create({
        data: {
          dailyEntryId: todayEntry.id,
          title,
          isCompleted: false,
          sortOrder: maxSortOrder
        }
      });
      existingTitles.add(normalized);
      moved += 1;
    }

    await tx.dailyEntry.update({
      where: { id: yesterdayEntry.id },
      data: { tomorrowItems: [] }
    });

    return { moved, skipped };
  });
}

export async function runAllUsersForTimezoneFallback() {
  const users = await prisma.user.findMany({ select: { id: true, timezone: true } });
  const results: Array<{ userId: string; moved: number; skipped: number }> = [];

  for (const user of users) {
    const today = formatDateInTimezone(new Date(), user.timezone);
    const result = await runForTomorrowMigration(user.id, today, user.timezone);
    results.push({ userId: user.id, moved: result.moved, skipped: result.skipped });
  }

  return results;
}
