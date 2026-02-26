import { PrismaClient, WaterUnit } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_WEIGHTS } from "../src/lib/score/constants";

const prisma = new PrismaClient();

async function main() {
  const email = "demo@dailyplanner.app";
  const passwordHash = await bcrypt.hash("DemoPass123!", 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash,
      name: "Demo User",
      timezone: "America/New_York",
      waterDefaultTarget: 8,
      waterDefaultUnit: WaterUnit.cups
    }
  });

  await prisma.scoreSetting.upsert({
    where: {
      userId_effectiveFrom: {
        userId: user.id,
        effectiveFrom: new Date("2025-01-01T00:00:00.000Z")
      }
    },
    update: {},
    create: {
      userId: user.id,
      effectiveFrom: new Date("2025-01-01T00:00:00.000Z"),
      tasksWeight: DEFAULT_WEIGHTS.tasks,
      growWeight: DEFAULT_WEIGHTS.grow,
      habitsWeight: DEFAULT_WEIGHTS.habits,
      exerciseWeight: DEFAULT_WEIGHTS.exercise,
      gratefulWeight: DEFAULT_WEIGHTS.grateful,
      waterWeight: DEFAULT_WEIGHTS.water
    }
  });

  const badges = [
    ["task_finisher", "Task Finisher", "Complete all planned tasks for 3 days"],
    ["hydration_hit", "Hydration Hit", "Meet water target for 7 consecutive days"],
    ["consistency_builder", "Consistency Builder", "Reach 75%+ for 5 consecutive days"],
    ["growth_note", "Growth Note", "Write grow note 5 days in a week"],
    ["balanced_day", "Balanced Day", "Hit 80%+ with all sections active"]
  ];

  for (const [code, name, description] of badges) {
    await prisma.badge.upsert({
      where: { code },
      update: {},
      create: { code, name, description }
    });
  }

  await prisma.challenge.upsert({
    where: { code: "hydration_7" },
    update: {},
    create: {
      code: "hydration_7",
      name: "Hydration 7-day",
      description: "Meet hydration target for 7 days",
      rules: { type: "water_streak", days: 7 },
      startDate: new Date("2026-01-01T00:00:00.000Z"),
      endDate: new Date("2026-12-31T23:59:59.999Z")
    }
  });

  console.log("Seed completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
