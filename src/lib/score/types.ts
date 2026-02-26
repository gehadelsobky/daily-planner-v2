export type ScoreComponentKey =
  | "tasks"
  | "grow"
  | "habits"
  | "exercise"
  | "grateful"
  | "water";

export type ScoreWeights = Record<ScoreComponentKey, number>;

export type DailyScoreInput = {
  weights: ScoreWeights;
  plannedTasks: number;
  completedTasks: number;
  growText: string | null | undefined;
  expectedHabits: number;
  doneHabits: number;
  exerciseMinutes: number;
  gratitudeCount: number;
  waterConsumed: number;
  waterTarget: number;
};

export type DailyScoreBreakdown = {
  key: ScoreComponentKey;
  rawWeight: number;
  effectiveWeight: number;
  normalizedScore: number | null;
  points: number;
  maxPoints: number;
  na: boolean;
};

export type DailyScoreResult = {
  scoreFloat: number;
  scorePercent: number;
  activeWeightSum: number;
  breakdown: DailyScoreBreakdown[];
};
