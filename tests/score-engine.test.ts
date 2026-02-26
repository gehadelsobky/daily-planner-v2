import { describe, expect, it } from "vitest";
import { computeDailyScore } from "@/lib/score/engine";
import { DEFAULT_WEIGHTS } from "@/lib/score/constants";
import { normalizeWaterTarget } from "@/lib/score/service";
import { WaterUnit } from "@prisma/client";

describe("score engine", () => {
  it("treats planned tasks=0 as NA and re-normalizes", () => {
    const result = computeDailyScore({
      weights: DEFAULT_WEIGHTS,
      plannedTasks: 0,
      completedTasks: 0,
      growText: "a".repeat(80),
      expectedHabits: 2,
      doneHabits: 2,
      exerciseMinutes: 30,
      gratitudeCount: 2,
      waterConsumed: 8,
      waterTarget: 8
    });

    expect(result.breakdown.find((b) => b.key === "tasks")?.na).toBe(true);
    expect(result.scorePercent).toBe(100);
  });

  it("treats no habits as NA and re-normalizes", () => {
    const result = computeDailyScore({
      weights: DEFAULT_WEIGHTS,
      plannedTasks: 2,
      completedTasks: 2,
      growText: "a".repeat(80),
      expectedHabits: 0,
      doneHabits: 0,
      exerciseMinutes: 30,
      gratitudeCount: 2,
      waterConsumed: 8,
      waterTarget: 8
    });

    expect(result.breakdown.find((b) => b.key === "habits")?.na).toBe(true);
    expect(result.scorePercent).toBe(100);
  });

  it("caps water at 100%", () => {
    const result = computeDailyScore({
      weights: DEFAULT_WEIGHTS,
      plannedTasks: 1,
      completedTasks: 1,
      growText: "a".repeat(80),
      expectedHabits: 1,
      doneHabits: 1,
      exerciseMinutes: 30,
      gratitudeCount: 2,
      waterConsumed: 20,
      waterTarget: 8
    });

    const water = result.breakdown.find((b) => b.key === "water");
    expect(water?.normalizedScore).toBe(1);
  });

  it("uses water fallback target", () => {
    expect(normalizeWaterTarget(null, WaterUnit.cups)).toBe(8);
    expect(normalizeWaterTarget(undefined, WaterUnit.ml)).toBe(2000);
  });

  it("matches exercise tiers", () => {
    const make = (minutes: number) =>
      computeDailyScore({
        weights: DEFAULT_WEIGHTS,
        plannedTasks: 1,
        completedTasks: 0,
        growText: "",
        expectedHabits: 1,
        doneHabits: 0,
        exerciseMinutes: minutes,
        gratitudeCount: 0,
        waterConsumed: 0,
        waterTarget: 8
      }).breakdown.find((b) => b.key === "exercise")?.normalizedScore;

    expect(make(0)).toBe(0);
    expect(make(1)).toBe(0.3);
    expect(make(9)).toBe(0.3);
    expect(make(10)).toBe(0.7);
    expect(make(29)).toBe(0.7);
    expect(make(30)).toBe(1);
  });

  it("marks grow complete when any content is added", () => {
    const grow = (text: string) =>
      computeDailyScore({
        weights: DEFAULT_WEIGHTS,
        plannedTasks: 1,
        completedTasks: 0,
        growText: text,
        expectedHabits: 1,
        doneHabits: 0,
        exerciseMinutes: 0,
        gratitudeCount: 0,
        waterConsumed: 0,
        waterTarget: 8
      }).breakdown.find((b) => b.key === "grow")?.normalizedScore;

    expect(grow("")).toBe(0);
    expect(grow("a".repeat(1))).toBe(1);
    expect(grow("a".repeat(80))).toBe(1);
  });

  it("rounds half up", () => {
    const result = computeDailyScore({
      weights: { tasks: 100, grow: 0, habits: 0, exercise: 0, grateful: 0, water: 0 },
      plannedTasks: 2,
      completedTasks: 1,
      growText: "",
      expectedHabits: 0,
      doneHabits: 0,
      exerciseMinutes: 0,
      gratitudeCount: 0,
      waterConsumed: 0,
      waterTarget: 8
    });

    expect(result.scoreFloat).toBe(50);
    expect(result.scorePercent).toBe(50);
  });
});
