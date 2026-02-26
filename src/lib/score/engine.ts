import { clamp, roundHalfUp } from "@/lib/utils";
import { DailyScoreInput, DailyScoreResult, ScoreComponentKey } from "@/lib/score/types";

function componentScore(key: ScoreComponentKey, input: DailyScoreInput): number | null {
  switch (key) {
    case "tasks": {
      if (input.plannedTasks <= 0) return null;
      return clamp(input.completedTasks / input.plannedTasks, 0, 1);
    }
    case "grow": {
      const len = (input.growText ?? "").trim().length;
      return len > 0 ? 1 : 0;
    }
    case "habits": {
      if (input.expectedHabits <= 0) return null;
      return clamp(input.doneHabits / input.expectedHabits, 0, 1);
    }
    case "exercise": {
      const m = Math.max(0, input.exerciseMinutes);
      if (m === 0) return 0;
      if (m <= 9) return 0.3;
      if (m <= 29) return 0.7;
      return 1;
    }
    case "grateful": {
      return input.gratitudeCount > 0 ? 1 : 0;
    }
    case "water": {
      if (input.waterTarget <= 0) return 0;
      return clamp(input.waterConsumed / input.waterTarget, 0, 1);
    }
  }
}

export function computeDailyScore(input: DailyScoreInput): DailyScoreResult {
  const keys: ScoreComponentKey[] = ["tasks", "grow", "habits", "exercise", "grateful", "water"];
  const componentScores = keys.map((key) => {
    const normalized = componentScore(key, input);
    const rawWeight = input.weights[key];
    return { key, normalized, rawWeight, na: normalized === null };
  });

  const activeWeightSum = componentScores
    .filter((x) => !x.na)
    .reduce((sum, x) => sum + x.rawWeight, 0);

  const breakdown = componentScores.map((item) => {
    const effectiveWeight = !item.na && activeWeightSum > 0 ? item.rawWeight / activeWeightSum : 0;
    const maxPoints = effectiveWeight * 100;
    const points = item.na || item.normalized === null ? 0 : maxPoints * item.normalized;
    return {
      key: item.key,
      rawWeight: item.rawWeight,
      effectiveWeight,
      normalizedScore: item.normalized,
      points,
      maxPoints,
      na: item.na
    };
  });

  const scoreFloat = breakdown.reduce((sum, b) => sum + b.points, 0);

  return {
    scoreFloat,
    scorePercent: roundHalfUp(scoreFloat),
    activeWeightSum,
    breakdown
  };
}
