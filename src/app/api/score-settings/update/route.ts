import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guard";
import { parseJson } from "@/lib/http";
import { scoreSettingsUpdateSchema } from "@/lib/validation/schemas";
import { validateWeights } from "@/lib/validation/score-settings";
import { prisma } from "@/lib/db";
import { toDateOnlyUtc } from "@/lib/date";

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const parsed = await parseJson(req, scoreSettingsUpdateSchema);
  if (!parsed.ok) return parsed.response;

  const validity = validateWeights(parsed.data.weights);
  if (!validity.ok) {
    return NextResponse.json({ error: "Invalid weights", details: validity.errors }, { status: 400 });
  }

  const latest = await prisma.scoreSetting.findFirst({
    where: { userId: auth.user.id },
    orderBy: { createdAt: "desc" }
  });

  if (latest) {
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - latest.createdAt.getTime() < sevenDays) {
      return NextResponse.json({ error: "Weights can only be changed every 7 days" }, { status: 429 });
    }
  }

  const effectiveFrom = toDateOnlyUtc(parsed.data.effective_from, auth.user.timezone);
  const saved = await prisma.scoreSetting.upsert({
    where: {
      userId_effectiveFrom: {
        userId: auth.user.id,
        effectiveFrom
      }
    },
    create: {
      userId: auth.user.id,
      effectiveFrom,
      tasksWeight: parsed.data.weights.tasks,
      growWeight: parsed.data.weights.grow,
      habitsWeight: parsed.data.weights.habits,
      exerciseWeight: parsed.data.weights.exercise,
      gratefulWeight: parsed.data.weights.grateful,
      waterWeight: parsed.data.weights.water
    },
    update: {
      tasksWeight: parsed.data.weights.tasks,
      growWeight: parsed.data.weights.grow,
      habitsWeight: parsed.data.weights.habits,
      exerciseWeight: parsed.data.weights.exercise,
      gratefulWeight: parsed.data.weights.grateful,
      waterWeight: parsed.data.weights.water
    }
  });

  return Response.json({ setting: saved });
}
