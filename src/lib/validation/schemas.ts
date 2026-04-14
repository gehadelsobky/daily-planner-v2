import { HabitFrequency, Priority, WaterUnit } from "@prisma/client";
import { z } from "zod";

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export const dateSchema = z
  .string()
  .refine(isValidIsoDate, { message: "Invalid date format. Use YYYY-MM-DD." });

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(80)
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128)
});

export const forgotPasswordSchema = z.object({
  email: z.string().email()
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(20).max(200),
    password: z.string().min(8).max(128),
    confirm_password: z.string().min(8).max(128)
  })
  .refine((val) => val.password === val.confirm_password, {
    path: ["confirm_password"],
    message: "Passwords do not match"
  });

export const dailyEntryUpsertSchema = z.object({
  date: dateSchema,
  grow_text: z.string().max(5000).optional().default(""),
  notes_text: z.string().max(10000).optional().default(""),
  tomorrow_items: z.array(z.string().min(1).max(200)).max(50).optional().default([]),
  top_wins_items: z.array(z.string().min(1).max(200)).max(3).optional().default([]),
  quote_items: z.array(z.string().min(1).max(300)).max(20).optional().default([])
});

export const createTaskSchema = z.object({
  date: dateSchema,
  title: z.string().min(1).max(200),
  priority: z.nativeEnum(Priority).optional().default(Priority.medium),
  category: z.string().max(80).optional().nullable(),
  sort_order: z.number().int().min(0).optional().default(0)
});

export const updateTaskSchema = z.object({
  task_id: z.string().uuid(),
  title: z.string().min(1).max(200).optional(),
  is_completed: z.boolean().optional(),
  priority: z.nativeEnum(Priority).optional(),
  category: z.string().max(80).optional().nullable(),
  sort_order: z.number().int().min(0).optional()
});

export const moveToTomorrowSchema = z.object({
  task_id: z.string().uuid()
});

export const deleteTaskSchema = z.object({
  task_id: z.string().uuid()
});

export const carryoverActionSchema = z
  .object({
    action: z.enum(["add_today", "reschedule", "dismiss"]),
    task_ids: z.array(z.string().uuid()).min(1).max(200),
    target_date: dateSchema.optional()
  })
  .superRefine((val, ctx) => {
    if (val.action === "reschedule" && !val.target_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["target_date"],
        message: "target_date is required for reschedule"
      });
    }
  });

export const closeDaySchema = z.object({
  date: dateSchema,
  incomplete_task_actions: z
    .array(
      z.object({
        task_id: z.string().uuid(),
        action: z.enum(["carry_to_tomorrow", "dismiss"])
      })
    )
    .max(200)
    .optional()
    .default([])
});

export const notificationBulkSchema = z.object({
  notification_ids: z.array(z.string().uuid()).min(1).max(200)
});

export const notificationActionSchema = z.object({
  notification_id: z.string().uuid(),
  action: z.enum(["add_today", "dismiss"])
});

export const habitCreateSchema = z.object({
  name: z.string().min(1).max(100),
  frequency: z.nativeEnum(HabitFrequency),
  target_value: z.number().int().min(1).max(100000).optional().nullable(),
  target_unit: z.string().min(1).max(30).optional().nullable(),
  custom_days: z.array(z.number().int().min(0).max(6)).optional().nullable()
});

export const habitUpdateSchema = z.object({
  habit_id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  frequency: z.nativeEnum(HabitFrequency).optional(),
  target_value: z.number().int().min(1).max(100000).optional().nullable(),
  target_unit: z.string().min(1).max(30).optional().nullable(),
  custom_days: z.array(z.number().int().min(0).max(6)).optional().nullable(),
  is_active: z.boolean().optional()
});

export const habitToggleSchema = z.object({
  habit_id: z.string().uuid(),
  date: dateSchema,
  is_done: z.boolean().optional(),
  value_done: z.number().int().min(0).max(100000).optional()
}).refine((data) => data.is_done !== undefined || data.value_done !== undefined, {
  message: "Either is_done or value_done is required"
});

export const exerciseLogSchema = z.object({
  date: dateSchema,
  type: z.string().min(1).max(100),
  minutes: z.number().int().min(0).max(600),
  intensity: z.enum(["low", "medium", "high"]).optional().nullable()
});

export const gratitudeAddSchema = z.object({
  date: dateSchema,
  text: z.string().min(1).max(500)
});

export const gratitudeDeleteSchema = z.object({
  item_id: z.string().uuid()
});

export const gratitudeUpdateSchema = z.object({
  item_id: z.string().uuid(),
  text: z.string().min(1).max(500)
});

export const waterUpdateSchema = z.object({
  date: dateSchema,
  consumed: z.number().int().min(0).max(100000),
  target: z.number().int().min(1).max(100000).optional().nullable(),
  unit: z.nativeEnum(WaterUnit).optional()
});

export const scoreSettingsUpdateSchema = z.object({
  effective_from: dateSchema,
  weights: z.object({
    tasks: z.number().int(),
    grow: z.number().int(),
    habits: z.number().int(),
    exercise: z.number().int(),
    grateful: z.number().int(),
    water: z.number().int()
  })
});

export const profileUpdateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  timezone: z.string().min(1).max(80).optional(),
  week_start_day: z.number().int().min(0).max(6).optional(),
  water_default_target: z.number().int().min(1).max(100000).optional().nullable(),
  water_default_unit: z.nativeEnum(WaterUnit).optional(),
  daily_layout: z.array(z.string().min(1).max(40)).max(30).optional()
});
