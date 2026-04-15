import { prisma } from "@/lib/db";

export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const now = new Date();
  const nextResetAt = new Date(now.getTime() + windowMs);

  return prisma.$transaction(async (tx) => {
    const bucket = await tx.rateLimitBucket.findUnique({ where: { key } });

    if (!bucket || bucket.resetAt <= now) {
      await tx.rateLimitBucket.upsert({
        where: { key },
        create: { key, count: 1, resetAt: nextResetAt },
        update: { count: 1, resetAt: nextResetAt }
      });
      return true;
    }

    if (bucket.count >= limit) {
      return false;
    }

    await tx.rateLimitBucket.update({
      where: { key },
      data: { count: { increment: 1 } }
    });
    return true;
  });
}
