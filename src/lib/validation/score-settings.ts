import { z } from "zod";
import { ScoreWeights } from "@/lib/score/types";

const ranges = {
  tasks: { min: 20, max: 40, required: true },
  grow: { min: 10, max: 30, required: true },
  water: { min: 10, max: 30, required: true },
  habits: { min: 5, max: 20, required: false },
  exercise: { min: 5, max: 20, required: false },
  grateful: { min: 5, max: 20, required: false }
} as const;

export const scoreSettingsSchema = z.object({
  tasks: z.number().int(),
  grow: z.number().int(),
  habits: z.number().int(),
  exercise: z.number().int(),
  grateful: z.number().int(),
  water: z.number().int()
});

export function validateWeights(weights: ScoreWeights): { ok: true } | { ok: false; errors: string[] } {
  const parsed = scoreSettingsSchema.safeParse(weights);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.map((i) => i.message) };
  }

  const errors: string[] = [];
  const entries = Object.entries(ranges) as [keyof typeof ranges, (typeof ranges)[keyof typeof ranges]][];
  let activeSections = 0;

  for (const [key, rule] of entries) {
    const value = weights[key];
    if (value > 0) activeSections += 1;

    if (rule.required && value === 0) {
      errors.push(`${key} is required and cannot be 0`);
    }

    if (value !== 0 && (value < rule.min || value > rule.max)) {
      errors.push(`${key} must be between ${rule.min} and ${rule.max}`);
    }
  }

  const sum = Object.values(weights).reduce((acc, curr) => acc + curr, 0);
  if (sum !== 100) {
    errors.push("weights must sum to 100");
  }

  if (activeSections < 4) {
    errors.push("at least 4 sections must be active");
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true };
}
