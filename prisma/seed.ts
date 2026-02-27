import {
  ExerciseIntensity,
  HabitFrequency,
  Priority,
  PrismaClient,
  WaterUnit
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_WEIGHTS } from "../src/lib/score/constants";

const prisma = new PrismaClient();

const DEMO_EMAIL = "demo@dailyplanner.app";
const DEMO_PASSWORD = "DemoPass123!";
const DEMO_SEED_KEY = "daily-planner-demo-2026-janfeb";
const RANGE_START = new Date("2026-01-01T00:00:00.000Z");
const RANGE_END = new Date("2026-02-28T00:00:00.000Z");
const COVERAGE = {
  grow: 0.7,
  notes: 0.55,
  quote: 0.45,
  gratitude: 0.8,
  water: 0.75
};

function mulberry32(seed: number) {
  return function random() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashToSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function randomInt(random: () => number, min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

function choose<T>(random: () => number, values: T[]): T {
  return values[Math.floor(random() * values.length)];
}

function eachUtcDay(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  let cursor = new Date(start);
  while (cursor <= end) {
    days.push(new Date(cursor));
    cursor = new Date(cursor);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {
      passwordHash,
      timezone: "America/New_York",
      waterDefaultTarget: 8,
      waterDefaultUnit: WaterUnit.cups
    },
    create: {
      email: DEMO_EMAIL,
      passwordHash,
      name: "Demo User",
      timezone: "America/New_York",
      waterDefaultTarget: 8,
      waterDefaultUnit: WaterUnit.cups
    }
  });

  // Reset only demo generated data in Jan/Feb 2026 so seed is deterministic and repeatable.
  await prisma.dailyEntry.deleteMany({
    where: {
      userId: user.id,
      date: {
        gte: RANGE_START,
        lte: new Date("2026-03-01T00:00:00.000Z")
      }
    }
  });
  await prisma.habitLog.deleteMany({
    where: {
      habit: {
        userId: user.id
      },
      date: {
        gte: RANGE_START,
        lte: new Date("2026-03-01T00:00:00.000Z")
      }
    }
  });
  await prisma.habit.deleteMany({
    where: { userId: user.id }
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

  const habits = await Promise.all([
    prisma.habit.create({
      data: {
        userId: user.id,
        name: "Read 20 minutes",
        frequency: HabitFrequency.daily,
        targetValue: 20,
        targetUnit: "minutes",
        isActive: true
      }
    }),
    prisma.habit.create({
      data: {
        userId: user.id,
        name: "Morning walk",
        frequency: HabitFrequency.weekdays,
        targetValue: 20,
        targetUnit: "minutes",
        isActive: true
      }
    }),
    prisma.habit.create({
      data: {
        userId: user.id,
        name: "No sugar",
        frequency: HabitFrequency.daily,
        targetValue: 1,
        targetUnit: "yes_no",
        isActive: true
      }
    }),
    prisma.habit.create({
      data: {
        userId: user.id,
        name: "Language practice",
        frequency: HabitFrequency.custom,
        customDays: [1, 3, 5],
        targetValue: 15,
        targetUnit: "minutes",
        isActive: true
      }
    })
  ]);

  const days = eachUtcDay(RANGE_START, RANGE_END);
  const taskTitles = [
    "Plan top 3 priorities",
    "Inbox zero 20 minutes",
    "Deep work block",
    "Follow up with client",
    "Review KPI dashboard",
    "Write summary notes",
    "Prepare tomorrow plan",
    "Team sync check-in",
    "Clean workspace",
    "Learning sprint"
  ];
  const gratitudePool = [
    "Good health and energy",
    "Supportive family",
    "A focused morning",
    "A helpful teammate",
    "Progress on key goals",
    "A calm evening walk",
    "New learning today"
  ];
  const quotesPool = [
    "\"Small progress each day adds up to big results.\"",
    "\"Discipline is choosing between what you want now and what you want most.\"",
    "\"Clarity first, then speed.\"",
    "\"Done is better than delayed perfection.\""
  ];

  for (const date of days) {
    const daySeed = hashToSeed(`${DEMO_SEED_KEY}-${date.toISOString().slice(0, 10)}`);
    const random = mulberry32(daySeed);
    const dayNumber = date.getUTCDate();
    const month = date.getUTCMonth() + 1;
    const weekday = date.getUTCDay();
    const isWeekend = weekday === 0 || weekday === 6;

    const gratitudeCount = random() < COVERAGE.gratitude ? randomInt(random, 1, 3) : 0;
    const gratitudeItems = Array.from({ length: gratitudeCount }, () => choose(random, gratitudePool));

    const topWinsCount = randomInt(random, 1, 3);
    const topWinsItems = Array.from({ length: topWinsCount }, (_, idx) => `Win ${idx + 1}: ${choose(random, taskTitles)}`);
    const quoteItems = random() < COVERAGE.quote ? [choose(random, quotesPool)] : [];

    const tomorrowItems = random() > 0.45
      ? [
          `Prepare priorities for ${month}-${Math.min(dayNumber + 1, 31)}`,
          choose(random, taskTitles)
        ]
      : [];

    const growText =
      random() < COVERAGE.grow
        ? `Today I improved by ${randomInt(random, 1, 3)}% through focused work, reflection, and better planning.`
        : "";

    const notesText =
      random() < COVERAGE.notes
        ? `Day review: ${choose(random, ["steady progress", "high focus", "some context switching", "strong execution"])}`
        : null;

    const entry = await prisma.dailyEntry.create({
      data: {
        userId: user.id,
        date,
        growText,
        notesText,
        tomorrowItems,
        topWinsItems,
        quoteItems
      }
    });

    const plannedTasks = randomInt(random, 3, 7);
    const completedTarget = Math.min(plannedTasks, Math.max(0, Math.round(plannedTasks * (isWeekend ? 0.55 : 0.72) + randomInt(random, -1, 1))));
    for (let i = 0; i < plannedTasks; i += 1) {
      const isCompleted = i < completedTarget;
      await prisma.task.create({
        data: {
          dailyEntryId: entry.id,
          title: choose(random, taskTitles),
          isCompleted,
          priority: choose(random, [Priority.high, Priority.medium, Priority.low]),
          category: choose(random, ["Work", "Admin", "Health", "Learning"]),
          sortOrder: i,
          completedAt: isCompleted ? new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 18, randomInt(random, 0, 59), 0)) : null
        }
      });
    }

    for (const item of gratitudeItems) {
      await prisma.gratitudeItem.create({
        data: {
          dailyEntryId: entry.id,
          text: item
        }
      });
    }

    const exerciseMinutes = isWeekend ? randomInt(random, 0, 45) : randomInt(random, 5, 50);
    if (exerciseMinutes > 0) {
      await prisma.exerciseLog.create({
        data: {
          dailyEntryId: entry.id,
          type: choose(random, ["Walking", "Running", "Gym", "Cycling", "Yoga"]),
          minutes: exerciseMinutes,
          intensity:
            exerciseMinutes >= 30
              ? ExerciseIntensity.high
              : exerciseMinutes >= 12
                ? ExerciseIntensity.medium
                : ExerciseIntensity.low
        }
      });
    }

    if (random() < COVERAGE.water) {
      const consumed = Math.max(0, Math.min(12, randomInt(random, 4, 11) + (isWeekend ? -1 : 0)));
      await prisma.waterLog.create({
        data: {
          dailyEntryId: entry.id,
          target: 8,
          consumed,
          unit: WaterUnit.cups
        }
      });
    }

    for (const habit of habits) {
      const shouldTrackToday =
        habit.frequency === HabitFrequency.daily ||
        (habit.frequency === HabitFrequency.weekdays && !isWeekend) ||
        (habit.frequency === HabitFrequency.custom &&
          Array.isArray(habit.customDays) &&
          (habit.customDays as number[]).includes(weekday));

      if (!shouldTrackToday) {
        continue;
      }

      const targetValue = habit.targetValue ?? 1;
      const valueDone = Math.max(0, Math.round(targetValue * (0.5 + random() * 0.75)));
      await prisma.habitLog.create({
        data: {
          habitId: habit.id,
          date,
          isDone: valueDone >= targetValue,
          valueDone
        }
      });
    }
  }

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

  console.log(`Seed completed. Demo data generated for ${days.length} days (Jan/Feb 2026).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
