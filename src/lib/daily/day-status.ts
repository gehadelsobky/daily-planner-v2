type ScoreBreakdownItem = {
  key: string;
  na: boolean;
  normalizedScore?: number | null;
};

type ComputeDayStatusInput = {
  selectedDate: string;
  today: string;
  closedAt?: Date | string | null;
  scorePercent: number;
  breakdown: ScoreBreakdownItem[];
  taskCount: number;
  completedTaskCount: number;
  growText?: string | null;
  notesText?: string | null;
  gratitudeCount?: number;
  exerciseCount?: number;
  waterConsumed?: number;
  tomorrowItemsCount?: number;
  topWinsCount?: number;
  quoteCount?: number;
};

const PAST_DAY_COMPLETION_THRESHOLD = 75;
const REQUIRED_KEYS = new Set(["tasks", "grow", "water"]);
const MIN_REQUIRED_SECTIONS_MET = 2;

export function computeDayStatus({
  selectedDate,
  today,
  closedAt,
  scorePercent,
  breakdown,
  taskCount,
  completedTaskCount,
  growText,
  notesText,
  gratitudeCount = 0,
  exerciseCount = 0,
  waterConsumed = 0,
  tomorrowItemsCount = 0,
  topWinsCount = 0,
  quoteCount = 0
}: ComputeDayStatusInput): "not_started" | "in_progress" | "completed" | "incomplete" {
  const requiredBreakdown = breakdown.filter((item) => REQUIRED_KEYS.has(item.key));
  const activeRequiredBreakdown = requiredBreakdown.filter((item) => !item.na);
  const requiredMet = activeRequiredBreakdown.filter(
    (item) => (item.normalizedScore ?? 0) >= 1
  ).length;
  const minRequiredMet = Math.min(MIN_REQUIRED_SECTIONS_MET, activeRequiredBreakdown.length);
  const qualifiesAsCompleted =
    scorePercent >= PAST_DAY_COMPLETION_THRESHOLD && requiredMet >= minRequiredMet;

  if (selectedDate < today || closedAt) {
    return qualifiesAsCompleted ? "completed" : "incomplete";
  }

  const hasActivity =
    taskCount > 0 ||
    Boolean(growText?.trim()) ||
    Boolean(notesText?.trim()) ||
    gratitudeCount > 0 ||
    exerciseCount > 0 ||
    waterConsumed > 0 ||
    tomorrowItemsCount > 0 ||
    topWinsCount > 0 ||
    quoteCount > 0;

  if (!hasActivity) {
    return "not_started";
  }

  if (taskCount > 0 && completedTaskCount === taskCount) {
    return "completed";
  }

  return "in_progress";
}
