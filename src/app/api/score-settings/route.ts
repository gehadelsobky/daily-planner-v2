import { requireUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { DEFAULT_WEIGHTS } from "@/lib/score/constants";

const PRESETS = [
  {
    name: "Balanced (Default)",
    weights: { tasks: 30, grow: 20, habits: 10, exercise: 10, grateful: 10, water: 20 }
  },
  {
    name: "Productivity Focus",
    weights: { tasks: 40, grow: 25, habits: 15, exercise: 10, grateful: 5, water: 5 }
  },
  {
    name: "Wellness Focus",
    weights: { tasks: 20, grow: 10, habits: 20, exercise: 20, grateful: 15, water: 15 }
  },
  {
    name: "Reflection & Growth",
    weights: { tasks: 20, grow: 30, habits: 20, exercise: 10, grateful: 15, water: 5 }
  }
];

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const current = await prisma.scoreSetting.findFirst({
    where: { userId: auth.user.id },
    orderBy: { effectiveFrom: "desc" }
  });

  return Response.json({
    current:
      current ?? {
        tasksWeight: DEFAULT_WEIGHTS.tasks,
        growWeight: DEFAULT_WEIGHTS.grow,
        habitsWeight: DEFAULT_WEIGHTS.habits,
        exerciseWeight: DEFAULT_WEIGHTS.exercise,
        gratefulWeight: DEFAULT_WEIGHTS.grateful,
        waterWeight: DEFAULT_WEIGHTS.water
      },
    presets: PRESETS
  });
}
