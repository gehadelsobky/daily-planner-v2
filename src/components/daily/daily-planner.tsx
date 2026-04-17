"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/fetcher";

type SectionId =
  | "top_wins"
  | "quotes"
  | "gratitude"
  | "grow_daily"
  | "tasks"
  | "water"
  | "habits"
  | "for_tomorrow"
  | "notes"
  | "exercise";

const DEFAULT_DAILY_SECTION_ORDER: SectionId[] = [
  "tasks",
  "habits",
  "water",
  "for_tomorrow",
  "grow_daily",
  "notes",
  "exercise",
  "gratitude",
  "top_wins",
  "quotes",
];

const DAILY_LAYOUT_PRESETS: Array<{ id: string; label: string; order: SectionId[] }> = [
  {
    id: "balanced",
    label: "Balanced",
    order: ["tasks", "habits", "water", "for_tomorrow", "grow_daily", "gratitude", "notes", "top_wins", "quotes", "exercise"]
  },
  {
    id: "focus",
    label: "Focus",
    order: ["tasks", "for_tomorrow", "notes", "habits", "water", "exercise", "grow_daily", "top_wins", "gratitude", "quotes"]
  },
  {
    id: "reflection",
    label: "Reflection",
    order: ["tasks", "grow_daily", "notes", "gratitude", "top_wins", "quotes", "for_tomorrow", "habits", "exercise", "water"]
  }
];

type DailyResponse = {
  entry: {
    id: string;
    closedAt: string | null;
    growText: string | null;
    notesText: string | null;
    tomorrowItems: string[];
    topWinsItems: string[];
    quoteItems: string[];
    tasks: Array<{
      id: string;
      title: string;
      isCompleted: boolean;
      priority: "high" | "medium" | "low";
      category: string | null;
    }>;
    gratitudeItems: Array<{ id: string; text: string }>;
    waterLog: { consumed: number; target: number | null } | null;
    exerciseLogs: Array<{ id: string; type: string; minutes: number }>;
  };
  habits: Array<{ id: string; name: string; targetValue: number | null; targetUnit: string | null }>;
  habitLogs: Array<{ habitId: string; isDone: boolean; valueDone: number | null }>;
  carryoverTasks: Array<{
    id: string;
    title: string;
    priority: "high" | "medium" | "low";
    sourceDate: string;
  }>;
  dayStatus: "not_started" | "in_progress" | "completed" | "incomplete";
  todayDate: string;
  score: {
    scorePercent: number;
    breakdown: Array<{
      key: string;
      points: number;
      maxPoints: number;
      na: boolean;
    }>;
  };
  waterDefaults: {
    target: number;
    unit: "cups" | "ml";
  };
};

type EditableSection = "task" | "gratitude" | "top_win" | "quote" | "grow";
type ActiveEditor = { section: EditableSection; id: string; value: string } | null;
type CloseAction = "carry_to_tomorrow" | "dismiss";
type SectionTone = "feature" | "regular" | "compact";

function AutoSectionCard({
  title,
  itemCount,
  children,
  dragHandle,
  tone = "regular",
  description = "Capture progress and keep this section current."
}: {
  title: string;
  itemCount: number;
  children: ReactNode;
  dragHandle?: ReactNode;
  tone?: SectionTone;
  description?: string;
}) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Card
      className={`flex flex-col self-start overflow-hidden ${
        tone === "feature"
          ? "gap-5 rounded-[1.6rem] border-[hsl(var(--border)/0.95)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,249,255,0.97))] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]"
          : tone === "compact"
            ? "gap-4 rounded-[1.35rem] border-[hsl(var(--border)/0.88)] bg-white/95 p-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]"
            : "gap-4 rounded-[1.45rem] border-[hsl(var(--border)/0.92)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,251,255,0.95))] p-5 shadow-[0_14px_32px_rgba(15,23,42,0.05)]"
      }`}
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className={`${tone === "feature" ? "min-h-[72px]" : tone === "compact" ? "min-h-[40px]" : "min-h-[56px]"} space-y-1`}>
            <h2 className={`${tone === "feature" ? "text-[1.15rem]" : "text-[1.02rem]"} font-semibold tracking-tight`}>
              {title}
            </h2>
            {tone !== "compact" ? (
              <p className="max-w-[34rem] text-[12px] leading-5 text-muted-foreground">{description}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs lg:shrink-0">
            {dragHandle}
            <Badge>{itemCount} items</Badge>
            <Button variant="ghost" onClick={() => setIsOpen((v) => !v)} className="h-8 rounded-full px-3 py-1 text-xs">
              {isOpen ? "Collapse" : "Expand"}
            </Button>
          </div>
        </div>
        <div className="h-px bg-[linear-gradient(90deg,rgba(23,69,199,0.12),rgba(23,69,199,0.04),transparent)]" />
      </div>
      {isOpen ? children : <p className="text-sm text-muted-foreground">Section collapsed</p>}
    </Card>
  );
}

function sectionLayoutClass(id: SectionId) {
  switch (id) {
    default:
      return "w-full";
  }
}

function sectionTone(id: SectionId): SectionTone {
  switch (id) {
    case "tasks":
      return "feature";
    case "for_tomorrow":
    case "notes":
    case "habits":
      return "regular";
    case "water":
    case "exercise":
    case "grow_daily":
    case "gratitude":
    case "top_wins":
    case "quotes":
      return "compact";
    default:
      return "regular";
  }
}

function sectionDescription(id: SectionId) {
  switch (id) {
    case "tasks":
      return "Capture priorities, organize execution, and keep momentum visible.";
    case "habits":
      return "Track measurable consistency across your routine.";
    case "water":
      return "Update hydration fast.";
    case "for_tomorrow":
      return "Park upcoming tasks so tomorrow starts with clarity.";
    case "notes":
      return "Capture day context and observations.";
    case "grow_daily":
      return "Save one insight from the day.";
    case "gratitude":
      return "Capture moments worth keeping.";
    case "top_wins":
      return "Highlight today’s strongest outcomes.";
    case "quotes":
      return "Keep meaningful lines in one place.";
    case "exercise":
      return "Log movement quickly.";
    default:
      return "Capture progress and keep this section current.";
  }
}

function formatDayStatusLabel(
  status: "not_started" | "in_progress" | "completed" | "incomplete" | undefined
) {
  if (!status) return "not started";
  return status.replaceAll("_", " ");
}

export function DailyPlannerClient({
  initialDate,
  initialLayout
}: {
  initialDate: string;
  initialLayout?: string[];
}) {
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskPriority, setTaskPriority] = useState<"high" | "medium" | "low">("medium");
  const [taskCategory, setTaskCategory] = useState("");
  const [taskSearch, setTaskSearch] = useState("");
  const [taskFilter, setTaskFilter] = useState<"all" | "pending" | "completed">("all");
  const [taskSort, setTaskSort] = useState<"manual" | "priority" | "alphabetical">("manual");
  const [activeEditor, setActiveEditor] = useState<ActiveEditor>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [gratefulText, setGratefulText] = useState("");
  const [growItemText, setGrowItemText] = useState("");
  const [topWinText, setTopWinText] = useState("");
  const [quoteText, setQuoteText] = useState("");
  const [growText, setGrowText] = useState("");
  const [topWinsItems, setTopWinsItems] = useState<string[]>([]);
  const [quoteItems, setQuoteItems] = useState<string[]>([]);
  const [notesText, setNotesText] = useState("");
  const [tomorrowText, setTomorrowText] = useState("");
  const [waterConsumed, setWaterConsumed] = useState(0);
  const [exerciseType, setExerciseType] = useState("");
  const [exerciseMinutes, setExerciseMinutes] = useState(0);
  const [carryoverDateDrafts, setCarryoverDateDrafts] = useState<Record<string, string>>({});
  const [habitValueDrafts, setHabitValueDrafts] = useState<Record<string, number>>({});
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [closeActionDrafts, setCloseActionDrafts] = useState<Record<string, CloseAction>>({});
  const [sectionOrder, setSectionOrder] = useState<SectionId[]>(
    sanitizeSectionOrder(initialLayout ?? [])
  );
  const qc = useQueryClient();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const queryKey = useMemo(() => ["daily", selectedDate], [selectedDate]);
  const syncKey = useMemo(() => ["daily-sync", selectedDate], [selectedDate]);

  const dailySync = useQuery({
    queryKey: syncKey,
    queryFn: () =>
      apiFetch<{ ok: true }>("/api/daily-entry/sync", {
        method: "POST",
        body: JSON.stringify({ date: selectedDate })
      })
  });

  const daily = useQuery({
    queryKey,
    queryFn: () => apiFetch<DailyResponse>(`/api/daily-entry?date=${selectedDate}`),
    enabled: dailySync.isSuccess
  });
  const profile = useQuery({
    queryKey: ["profile"],
    queryFn: () =>
      apiFetch<{ profile: { dailyLayout?: string[] } }>("/api/profile")
  });
  const savedSectionOrder = useMemo(
    () => sanitizeSectionOrder(profile.data?.profile?.dailyLayout ?? initialLayout ?? []),
    [initialLayout, profile.data?.profile?.dailyLayout]
  );
  const secondarySectionOrder = useMemo(
    () => sectionOrder.filter((id) => id !== "tasks"),
    [sectionOrder]
  );
  const hasUnsavedLayoutChanges = sectionOrder.join("|") !== savedSectionOrder.join("|");
  const isDefaultLayout = sectionOrder.join("|") === DEFAULT_DAILY_SECTION_ORDER.join("|");

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: syncKey });
    await qc.invalidateQueries({ queryKey });
  };
  const saveLayout = useMutation({
    mutationFn: async () =>
      apiFetch("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({ daily_layout: sectionOrder })
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["profile"] });
    }
  });

  const addTask = useMutation({
    mutationFn: async () => {
      if (!taskTitle.trim()) return;
      await apiFetch("/api/tasks/create", {
        method: "POST",
        body: JSON.stringify({
          date: selectedDate,
          title: taskTitle,
          priority: taskPriority,
          category: taskCategory.trim() || null
        })
      });
      setTaskTitle("");
      setTaskPriority("medium");
      setTaskCategory("");
    },
    onSuccess: refresh
  });

  const moveTaskToTomorrow = useMutation({
    mutationFn: (payload: { task_id: string }) =>
      apiFetch("/api/tasks/move-to-tomorrow", {
        method: "POST",
        body: JSON.stringify(payload)
      }),
    onSuccess: refresh
  });

  const toggleTask = useMutation({
    mutationFn: (payload: { task_id: string; is_completed: boolean }) =>
      apiFetch("/api/tasks/update", {
        method: "PATCH",
        body: JSON.stringify(payload)
      }),
    onSuccess: refresh
  });

  const updateTaskTitle = useMutation({
    mutationFn: (payload: { task_id: string; title: string }) =>
      apiFetch("/api/tasks/update", {
        method: "PATCH",
        body: JSON.stringify(payload)
      }),
    onSuccess: async () => {
      cancelInlineEdit();
      refresh();
    }
  });

  const updateTaskMeta = useMutation({
    mutationFn: (payload: {
      task_id: string;
      priority?: "high" | "medium" | "low";
      category?: string | null;
    }) =>
      apiFetch("/api/tasks/update", {
        method: "PATCH",
        body: JSON.stringify(payload)
      }),
    onSuccess: refresh
  });

  const deleteTask = useMutation({
    mutationFn: (payload: { task_id: string }) =>
      apiFetch("/api/tasks/delete", {
        method: "DELETE",
        body: JSON.stringify(payload)
      }),
    onSuccess: refresh
  });

  const addGratitude = useMutation({
    mutationFn: async () => {
      if (!gratefulText.trim()) return;
      await apiFetch("/api/gratitude/add", {
        method: "POST",
        body: JSON.stringify({ date: selectedDate, text: gratefulText })
      });
      setGratefulText("");
    },
    onSuccess: refresh
  });

  const updateGratitude = useMutation({
    mutationFn: (payload: { item_id: string; text: string }) =>
      apiFetch("/api/gratitude/delete", {
        method: "PATCH",
        body: JSON.stringify(payload)
      }),
    onSuccess: async () => {
      cancelInlineEdit();
      refresh();
    }
  });

  const deleteGratitude = useMutation({
    mutationFn: (payload: { item_id: string }) =>
      apiFetch("/api/gratitude/delete", {
        method: "DELETE",
        body: JSON.stringify(payload)
      }),
    onSuccess: refresh
  });

  const saveEntry = useMutation({
    mutationFn: async () => {
      await apiFetch("/api/daily-entry/upsert", {
        method: "POST",
        body: JSON.stringify({
          date: selectedDate,
          grow_text: growText,
          notes_text: notesText,
          tomorrow_items: tomorrowText
            .split("\n")
            .map((x) => x.trim())
            .filter(Boolean),
          top_wins_items: topWinsItems,
          quote_items: quoteItems
        })
      });
    },
    onSuccess: refresh
  });

  const addGrowItem = useMutation({
    mutationFn: async () => {
      const item = growItemText.trim();
      if (!item) return;
      const existing = growText
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean);
      const updatedGrow = [...existing, item].join("\n");
      await apiFetch("/api/daily-entry/upsert", {
        method: "POST",
        body: JSON.stringify({
          date: selectedDate,
          grow_text: updatedGrow,
          notes_text: notesText,
          tomorrow_items: tomorrowText
            .split("\n")
            .map((x) => x.trim())
            .filter(Boolean),
          top_wins_items: topWinsItems,
          quote_items: quoteItems
        })
      });
      setGrowItemText("");
      setGrowText(updatedGrow);
    },
    onSuccess: refresh
  });

  const addTopWin = useMutation({
    mutationFn: async () => {
      const item = topWinText.trim();
      if (!item || topWinsItems.length >= 3) return;
      const updatedTopWins = [...topWinsItems, item];
      await apiFetch("/api/daily-entry/upsert", {
        method: "POST",
        body: JSON.stringify({
          date: selectedDate,
          grow_text: growText,
          notes_text: notesText,
          tomorrow_items: tomorrowText
            .split("\n")
            .map((x) => x.trim())
            .filter(Boolean),
          top_wins_items: updatedTopWins,
          quote_items: quoteItems
        })
      });
      setTopWinText("");
      setTopWinsItems(updatedTopWins);
    },
    onSuccess: refresh
  });

  const addQuote = useMutation({
    mutationFn: async () => {
      const item = quoteText.trim();
      if (!item) return;
      const normalized = `"${item.replace(/^"+|"+$/g, "")}"`;
      const updatedQuotes = [...quoteItems, normalized];
      await apiFetch("/api/daily-entry/upsert", {
        method: "POST",
        body: JSON.stringify({
          date: selectedDate,
          grow_text: growText,
          notes_text: notesText,
          tomorrow_items: tomorrowText
            .split("\n")
            .map((x) => x.trim())
            .filter(Boolean),
          top_wins_items: topWinsItems,
          quote_items: updatedQuotes
        })
      });
      setQuoteText("");
      setQuoteItems(updatedQuotes);
    },
    onSuccess: refresh
  });

  const saveEntrySections = useMutation({
    mutationFn: async (payload: { topWins: string[]; quotes: string[]; grow: string }) => {
      await apiFetch("/api/daily-entry/upsert", {
        method: "POST",
        body: JSON.stringify({
          date: selectedDate,
          grow_text: payload.grow,
          notes_text: notesText,
          tomorrow_items: tomorrowText
            .split("\n")
            .map((x) => x.trim())
            .filter(Boolean),
          top_wins_items: payload.topWins,
          quote_items: payload.quotes
        })
      });
    },
    onSuccess: async () => {
      cancelInlineEdit();
      refresh();
    }
  });

  const saveWater = useMutation({
    mutationFn: async () => {
      await apiFetch("/api/water/update", {
        method: "POST",
        body: JSON.stringify({ date: selectedDate, consumed: waterConsumed })
      });
    },
    onSuccess: refresh
  });

  const toggleHabit = useMutation({
    mutationFn: (payload: { habit_id: string; is_done?: boolean; value_done?: number }) =>
      apiFetch("/api/habit-logs/toggle", {
        method: "POST",
        body: JSON.stringify({ ...payload, date: selectedDate })
      }),
    onSuccess: refresh
  });

  const addExercise = useMutation({
    mutationFn: async () => {
      if (!exerciseType.trim()) return;
      await apiFetch("/api/exercise/log", {
        method: "POST",
        body: JSON.stringify({
          date: selectedDate,
          type: exerciseType,
          minutes: exerciseMinutes,
          intensity: "medium"
        })
      });
      setExerciseType("");
      setExerciseMinutes(0);
    },
    onSuccess: refresh
  });
  const carryoverAction = useMutation({
    mutationFn: (payload: { action: "add_today" | "reschedule" | "dismiss"; task_ids: string[]; target_date?: string }) =>
      apiFetch("/api/tasks/carryover", {
        method: "POST",
        body: JSON.stringify(payload)
      }),
    onSuccess: refresh
  });
  const closeDay = useMutation({
    mutationFn: async () => {
      await apiFetch("/api/daily-entry/upsert", {
        method: "POST",
        body: JSON.stringify({
          date: selectedDate,
          grow_text: growText,
          notes_text: notesText,
          tomorrow_items: tomorrowText
            .split("\n")
            .map((x) => x.trim())
            .filter(Boolean),
          top_wins_items: topWinsItems,
          quote_items: quoteItems
        })
      });

      const incompleteTaskActions =
        daily.data?.entry.tasks
          .filter((task) => !task.isCompleted)
          .map((task) => ({
            task_id: task.id,
            action: closeActionDrafts[task.id] ?? "carry_to_tomorrow"
          })) ?? [];

      return apiFetch("/api/daily-entry/close", {
        method: "POST",
        body: JSON.stringify({
          date: selectedDate,
          incomplete_task_actions: incompleteTaskActions
        })
      });
    },
    onSuccess: async () => {
      setIsReviewOpen(false);
      await refresh();
    }
  });

  const score = daily.data?.score.scorePercent ?? 0;
  const selectedDateLabel = useMemo(() => {
    const [year, month, day] = selectedDate.split("-");
    if (!year || !month || !day) return selectedDate;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day));
    if (Number.isNaN(parsed.getTime())) return `${day}-${month}-${year}`;
    const weekday = parsed.toLocaleDateString("en-US", { weekday: "short" });
    return `${weekday} ${day}-${month}-${year}`;
  }, [selectedDate]);
  const effectiveWaterTarget = daily.data?.waterDefaults?.target ?? daily.data?.entry.waterLog?.target ?? 8;
  const effectiveWaterUnit = daily.data?.waterDefaults?.unit ?? "cups";
  const isFutureDay = Boolean(daily.data?.todayDate && selectedDate > daily.data.todayDate);
  const isToday = daily.data?.todayDate === selectedDate;
  const incompleteTasks = daily.data?.entry.tasks.filter((task) => !task.isCompleted) ?? [];
  const taskStats = useMemo(() => {
    const tasks = daily.data?.entry.tasks ?? [];
    const completed = tasks.filter((task) => task.isCompleted).length;
    return {
      total: tasks.length,
      completed,
      pending: tasks.length - completed,
      percent: tasks.length ? Math.round((completed / tasks.length) * 100) : 0
    };
  }, [daily.data?.entry.tasks]);
  const visibleTasks = useMemo(() => {
    const tasks = [...(daily.data?.entry.tasks ?? [])];
    const normalizedSearch = taskSearch.trim().toLowerCase();

    const filtered = tasks.filter((task) => {
      const matchesFilter =
        taskFilter === "all" ||
        (taskFilter === "pending" && !task.isCompleted) ||
        (taskFilter === "completed" && task.isCompleted);
      const matchesSearch =
        !normalizedSearch ||
        task.title.toLowerCase().includes(normalizedSearch) ||
        (task.category ?? "").toLowerCase().includes(normalizedSearch) ||
        task.priority.toLowerCase().includes(normalizedSearch);
      return matchesFilter && matchesSearch;
    });

    if (taskSort === "priority") {
      const rank = { high: 0, medium: 1, low: 2 } as const;
      filtered.sort((a, b) => {
        const priorityDiff = rank[a.priority] - rank[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        if (a.isCompleted !== b.isCompleted) return Number(a.isCompleted) - Number(b.isCompleted);
        return a.title.localeCompare(b.title);
      });
    } else if (taskSort === "alphabetical") {
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    }

    return filtered;
  }, [daily.data?.entry.tasks, taskFilter, taskSearch, taskSort]);
  const growItemsCount = growText
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean).length;
  const reviewSummary = {
    completedTasks: daily.data?.entry.tasks.filter((task) => task.isCompleted).length ?? 0,
    totalTasks: daily.data?.entry.tasks.length ?? 0,
    gratitudeCount: daily.data?.entry.gratitudeItems.length ?? 0,
    hasGrow: growItemsCount > 0,
    notesCount: notesText.trim() ? 1 : 0,
    waterMet: waterConsumed >= effectiveWaterTarget,
    exerciseCount: daily.data?.entry.exerciseLogs.length ?? 0,
    topWinsCount: topWinsItems.length
  };
  const reflectionReminders = [
    !reviewSummary.topWinsCount ? "Add at least one Top Win before closing." : null,
    !reviewSummary.hasGrow ? "Add one Grow Daily takeaway before closing." : null,
    !reviewSummary.gratitudeCount ? "Add one gratitude item before closing." : null
  ].filter(Boolean) as string[];
  const carryoverCount = daily.data?.carryoverTasks.length ?? 0;
  const showMorningPlanningCard = isToday && daily.data?.dayStatus !== "completed";
  const morningPrompt =
    daily.data?.dayStatus === "not_started"
      ? "Start with the essentials, choose what matters most, and enter the day with clarity."
      : "You already started today. Use this quick summary to refocus before continuing.";
  const morningChecklist = [
    carryoverCount > 0 ? `${carryoverCount} unfinished tasks are waiting for review.` : "No carryover tasks are blocking your start.",
    reviewSummary.totalTasks > 0
      ? `${reviewSummary.totalTasks} tasks are already planned for today.`
      : "No tasks planned yet. Add your first task to anchor the day.",
    reviewSummary.waterMet
      ? "Water target is already on track."
      : `Water goal is ${effectiveWaterTarget} ${effectiveWaterUnit} today.`
  ];
  const sectionPresentation = (item: { points: number; maxPoints: number; na: boolean }) => {
    if (item.na || item.maxPoints <= 0) return "NA";
    const ratio = Math.max(0, Math.min(1, item.points / item.maxPoints));
    return `${Math.round(ratio * 100)}%`;
  };
  const sectionState = (item: { points: number; maxPoints: number; na: boolean }) => {
    if (item.na || item.maxPoints <= 0) return "na";
    if (item.points / item.maxPoints >= 0.999) return "completed";
    return "pending";
  };
  const completionHeadline =
    score >= 85
      ? "Excellent rhythm today"
      : score >= 60
        ? "Solid progress, keep closing"
        : "Start with one meaningful win";
  const completionGuidance =
    taskStats.pending > 0
      ? `${taskStats.pending} task${taskStats.pending === 1 ? "" : "s"} still need attention.`
      : "Your task list is fully closed for this date.";
  const focusSummary = [
    carryoverCount > 0 ? `${carryoverCount} carryover task${carryoverCount === 1 ? "" : "s"}` : "No carryover tasks",
    `${reviewSummary.totalTasks} planned task${reviewSummary.totalTasks === 1 ? "" : "s"}`,
    reviewSummary.waterMet ? "Water target met" : `Water target ${effectiveWaterTarget} ${effectiveWaterUnit}`
  ];

  useEffect(() => {
    if (!daily.data?.entry) return;
    setGrowText(daily.data.entry.growText ?? "");
    setTopWinsItems(asStringArray(daily.data.entry.topWinsItems));
    setQuoteItems(asStringArray(daily.data.entry.quoteItems));
    setNotesText(daily.data.entry.notesText ?? "");
    setTomorrowText((daily.data.entry.tomorrowItems ?? []).join("\n"));
    setWaterConsumed(daily.data.entry.waterLog?.consumed ?? 0);
    if (daily.data.habits?.length) {
      const drafts: Record<string, number> = {};
      for (const habit of daily.data.habits) {
        const log = daily.data.habitLogs?.find((h) => h.habitId === habit.id);
        drafts[habit.id] = log?.valueDone ?? 0;
      }
      setHabitValueDrafts(drafts);
    }
  }, [daily.data?.entry, daily.data?.habits, daily.data?.habitLogs]);

  useEffect(() => {
    const nextDrafts: Record<string, CloseAction> = {};
    for (const task of daily.data?.entry.tasks ?? []) {
      if (!task.isCompleted) {
        nextDrafts[task.id] = closeActionDrafts[task.id] ?? "carry_to_tomorrow";
      }
    }
    setCloseActionDrafts(nextDrafts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daily.data?.entry.tasks]);

  useEffect(() => {
    if (!daily.data?.carryoverTasks?.length) {
      setCarryoverDateDrafts({});
      return;
    }
    const defaultDate = daily.data.todayDate ?? selectedDate;
    setCarryoverDateDrafts((prev) => {
      const next = { ...prev };
      for (const task of daily.data.carryoverTasks) {
        if (!next[task.id]) next[task.id] = defaultDate;
      }
      return next;
    });
  }, [daily.data?.carryoverTasks, daily.data?.todayDate, selectedDate]);

  useEffect(() => {
    const nextOrder = sanitizeSectionOrder(profile.data?.profile?.dailyLayout ?? []);
    if (nextOrder.join("|") !== sectionOrder.join("|")) {
      setSectionOrder(nextOrder);
    }
  }, [profile.data?.profile?.dailyLayout]);

  const renderSection = (id: SectionId, dragHandle?: ReactNode) => {
    const sectionProps = {
      dragHandle,
      tone: sectionTone(id),
      description: sectionDescription(id)
    };

    switch (id) {
      case "top_wins":
        return (
          <AutoSectionCard title="Top 3 Wins Of The Day" itemCount={topWinsItems.length} {...sectionProps}>
            <div className="flex gap-2">
              <Input
                value={topWinText}
                onChange={(e) => setTopWinText(e.target.value)}
                placeholder="Add a win"
                disabled={topWinsItems.length >= 3}
              />
              <Button onClick={() => addTopWin.mutate()} disabled={topWinsItems.length >= 3}>
                Add
              </Button>
            </div>
            <ul className="space-y-1 text-sm">
              {topWinsItems.map((item, idx) => (
                <li key={`${item}-${idx}`} className="group flex items-center justify-between gap-2">
                  {isEditing("top_win", String(idx)) ? (
                    <Input
                      autoFocus
                      value={activeEditor?.value ?? ""}
                      onChange={(e) => setActiveEditorValue(e.target.value)}
                      onBlur={() => commitTopWinEdit(idx)}
                      onKeyDown={(e) => handleInlineEditKeyDown(e, () => commitTopWinEdit(idx))}
                      className="h-8"
                      disabled={saveEntrySections.isPending}
                    />
                  ) : (
                    <span className="grow">• {item}</span>
                  )}
                  <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                    <IconActionButton label="Edit top win" onClick={() => startInlineEdit("top_win", String(idx), item)}>
                      <Pencil className="h-4 w-4" />
                    </IconActionButton>
                    <IconActionButton label="Delete top win" onClick={() => removeTopWin(idx)}>
                      <Trash2 className="h-4 w-4" />
                    </IconActionButton>
                  </div>
                </li>
              ))}
            </ul>
            {topWinsItems.length >= 3 ? (
              <p className="text-xs text-muted-foreground">Maximum 3 wins per day.</p>
            ) : null}
          </AutoSectionCard>
        );
      case "quotes":
        return (
          <AutoSectionCard title="Quotes" itemCount={quoteItems.length} {...sectionProps}>
            <div className="flex gap-2">
              <Input
                value={quoteText}
                onChange={(e) => setQuoteText(e.target.value)}
                placeholder='Add quote text (saved as "quote")'
              />
              <Button onClick={() => addQuote.mutate()}>Add</Button>
            </div>
            <ul className="space-y-1 text-sm">
              {quoteItems.map((item, idx) => (
                <li key={`${item}-${idx}`} className="group flex items-center justify-between gap-2">
                  {isEditing("quote", String(idx)) ? (
                    <Input
                      autoFocus
                      value={activeEditor?.value ?? ""}
                      onChange={(e) => setActiveEditorValue(e.target.value)}
                      onBlur={() => commitQuoteEdit(idx)}
                      onKeyDown={(e) => handleInlineEditKeyDown(e, () => commitQuoteEdit(idx))}
                      className="h-8"
                      disabled={saveEntrySections.isPending}
                    />
                  ) : (
                    <span className="grow">• {item}</span>
                  )}
                  <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                    <IconActionButton
                      label="Edit quote"
                      onClick={() => startInlineEdit("quote", String(idx), item.replace(/^\"+|\"+$/g, ""))}
                    >
                      <Pencil className="h-4 w-4" />
                    </IconActionButton>
                    <IconActionButton label="Delete quote" onClick={() => removeQuote(idx)}>
                      <Trash2 className="h-4 w-4" />
                    </IconActionButton>
                  </div>
                </li>
              ))}
            </ul>
          </AutoSectionCard>
        );
      case "gratitude":
        return (
          <AutoSectionCard title="Gratitude" itemCount={daily.data?.entry.gratitudeItems.length ?? 0} {...sectionProps}>
            <div className="flex gap-2">
              <Input value={gratefulText} onChange={(e) => setGratefulText(e.target.value)} placeholder="I am grateful for..." />
              <Button onClick={() => addGratitude.mutate()}>Add</Button>
            </div>
            <ul className="space-y-1 text-sm">
              {daily.data?.entry.gratitudeItems.map((g) => (
                <li key={g.id} className="group flex items-center justify-between gap-2">
                  {isEditing("gratitude", g.id) ? (
                    <Input
                      autoFocus
                      value={activeEditor?.value ?? ""}
                      onChange={(e) => setActiveEditorValue(e.target.value)}
                      onBlur={() => commitGratitudeEdit(g)}
                      onKeyDown={(e) => handleInlineEditKeyDown(e, () => commitGratitudeEdit(g))}
                      className="h-8"
                      disabled={updateGratitude.isPending}
                    />
                  ) : (
                    <span className="grow">• {g.text}</span>
                  )}
                  <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                    <IconActionButton label="Edit gratitude item" onClick={() => startInlineEdit("gratitude", g.id, g.text)}>
                      <Pencil className="h-4 w-4" />
                    </IconActionButton>
                    <IconActionButton label="Delete gratitude item" onClick={() => deleteGratitude.mutate({ item_id: g.id })}>
                      <Trash2 className="h-4 w-4" />
                    </IconActionButton>
                  </div>
                </li>
              ))}
            </ul>
          </AutoSectionCard>
        );
      case "grow_daily":
        return (
          <AutoSectionCard
            title="Grow Daily"
            itemCount={growText.split("\n").map((x) => x.trim()).filter(Boolean).length}
            {...sectionProps}
          >
            <div className="flex gap-2">
              <Input
                value={growItemText}
                onChange={(e) => setGrowItemText(e.target.value)}
                placeholder="What did you learn today?"
              />
              <Button onClick={() => addGrowItem.mutate()}>Add</Button>
            </div>
            <ul className="space-y-1 text-sm">
              {growText
                .split("\n")
                .map((x) => x.trim())
                .filter(Boolean)
                .map((item, idx) => (
                  <li key={`${item}-${idx}`} className="group flex items-center justify-between gap-2">
                    {isEditing("grow", String(idx)) ? (
                      <Input
                        autoFocus
                        value={activeEditor?.value ?? ""}
                        onChange={(e) => setActiveEditorValue(e.target.value)}
                        onBlur={() => commitGrowEdit(idx)}
                        onKeyDown={(e) => handleInlineEditKeyDown(e, () => commitGrowEdit(idx))}
                        className="h-8"
                        disabled={saveEntrySections.isPending}
                      />
                    ) : (
                      <span className="grow">• {item}</span>
                    )}
                    <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                      <IconActionButton label="Edit grow item" onClick={() => startInlineEdit("grow", String(idx), item)}>
                        <Pencil className="h-4 w-4" />
                      </IconActionButton>
                      <IconActionButton label="Delete grow item" onClick={() => removeGrowItem(idx)}>
                        <Trash2 className="h-4 w-4" />
                      </IconActionButton>
                    </div>
                  </li>
                ))}
            </ul>
          </AutoSectionCard>
        );
      case "tasks":
        return (
          <AutoSectionCard title="Tasks" itemCount={daily.data?.entry.tasks.length ?? 0} {...sectionProps}>
            <div className="rounded-[1.25rem] border border-border bg-[linear-gradient(180deg,rgba(247,251,255,0.92),rgba(255,255,255,0.96))] p-5 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div className="space-y-1">
                    <p className="text-lg font-semibold text-[hsl(var(--foreground))]">
                      {taskStats.completed} of {taskStats.total} tasks completed
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {taskStats.pending} pending
                      {taskSearch.trim() ? ` • showing ${visibleTasks.length} results` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>{taskStats.percent}% complete</Badge>
                    <Badge>{visibleTasks.length} visible</Badge>
                  </div>
                </div>

                <Progress value={taskStats.percent} />

                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  <SummaryRow label="Completed" value={String(taskStats.completed)} />
                  <SummaryRow label="Pending" value={String(taskStats.pending)} />
                  <SummaryRow label="Visible now" value={String(visibleTasks.length)} />
                  <SummaryRow label="Completion" value={`${taskStats.percent}%`} />
                </div>

                <div className="grid gap-3 rounded-[1rem] border border-border bg-white/90 p-4 lg:grid-cols-[minmax(0,1.2fr)_190px_190px]">
                  <Input
                    className="min-w-0"
                    value={taskSearch}
                    onChange={(e) => setTaskSearch(e.target.value)}
                    placeholder="Search tasks, category, or priority"
                  />
                  <select
                    value={taskFilter}
                    onChange={(e) => setTaskFilter(e.target.value as "all" | "pending" | "completed")}
                    className="h-10 min-w-0 w-full rounded-xl border border-[hsl(var(--input))] bg-white px-3 text-sm"
                  >
                    <option value="all">All tasks</option>
                    <option value="pending">Pending only</option>
                    <option value="completed">Completed only</option>
                  </select>
                  <select
                    value={taskSort}
                    onChange={(e) => setTaskSort(e.target.value as "manual" | "priority" | "alphabetical")}
                    className="h-10 min-w-0 w-full rounded-xl border border-[hsl(var(--input))] bg-white px-3 text-sm"
                  >
                    <option value="manual">Original order</option>
                    <option value="priority">Priority first</option>
                    <option value="alphabetical">Alphabetical</option>
                  </select>
                </div>

                <div className="grid gap-3 rounded-[1rem] border border-border bg-white/90 p-4 xl:grid-cols-[minmax(0,1fr)_160px_240px_130px]">
                  <Input
                    className="min-w-0"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder="Add task"
                  />
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as "high" | "medium" | "low")}
                    className="h-10 min-w-0 w-full rounded-xl border border-[hsl(var(--input))] bg-white px-3 text-sm"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                  <Input
                    className="min-w-0"
                    value={taskCategory}
                    onChange={(e) => setTaskCategory(e.target.value)}
                    placeholder="Category (optional)"
                  />
                  <Button className="w-full" onClick={() => addTask.mutate()}>
                    Add
                  </Button>
                </div>
              </div>
            </div>

            <ul className="space-y-3 text-sm">
              {visibleTasks.map((task) => (
                <li
                  key={task.id}
                  className={`group rounded-[1.15rem] border border-border bg-white/90 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition ${
                    task.isCompleted ? "opacity-80" : ""
                  }`}
                >
                  {(() => {
                    const isExpanded = expandedTaskId === task.id || isEditing("task", task.id);
                    return (
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={task.isCompleted}
                          onChange={(e) =>
                            toggleTask.mutate({ task_id: task.id, is_completed: e.target.checked })
                          }
                          className="mt-1 h-5 w-5 shrink-0 rounded border-border"
                        />
                        <div className="min-w-0 grow space-y-3">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0 grow space-y-2">
                              {isEditing("task", task.id) ? (
                                <Input
                                  autoFocus
                                  value={activeEditor?.value ?? ""}
                                  onChange={(e) => setActiveEditorValue(e.target.value)}
                                  onBlur={() => commitTaskEdit(task)}
                                  onKeyDown={(e) => handleInlineEditKeyDown(e, () => commitTaskEdit(task))}
                                  className="h-9"
                                  disabled={updateTaskTitle.isPending}
                                />
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => toggleTaskExpanded(task.id)}
                                  className={`w-full text-left text-base font-medium leading-7 transition-colors hover:text-[#1745C7] ${
                                    task.isCompleted ? "line-through text-muted-foreground" : "text-[hsl(var(--foreground))]"
                                  }`}
                                >
                                  {task.title}
                                </button>
                              )}

                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`rounded-full px-2 py-1 text-xs font-medium ${priorityClasses(task.priority)}`}>
                                  {capitalizeTaskPriority(task.priority)}
                                </span>
                                {task.category ? (
                                  <span className="rounded-full bg-[hsl(var(--muted))] px-2 py-1 text-xs text-[hsl(var(--muted-foreground))]">
                                    {task.category}
                                  </span>
                                ) : null}
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-1 self-start opacity-100 transition lg:opacity-0 lg:group-hover:opacity-100 lg:focus-within:opacity-100">
                              <IconActionButton
                                label={isExpanded ? "Hide task details" : "Show task details"}
                                onClick={() => toggleTaskExpanded(task.id)}
                              >
                                <span className="text-[11px] font-semibold">{isExpanded ? "−" : "+"}</span>
                              </IconActionButton>
                              <IconActionButton
                                label="Move task to tomorrow"
                                onClick={() => moveTaskToTomorrow.mutate({ task_id: task.id })}
                              >
                                <span className="text-[11px] font-semibold">T+1</span>
                              </IconActionButton>
                              <IconActionButton label="Edit task" onClick={() => startInlineEdit("task", task.id, task.title)}>
                                <Pencil className="h-4 w-4" />
                              </IconActionButton>
                              <IconActionButton label="Delete task" onClick={() => deleteTask.mutate({ task_id: task.id })}>
                                <Trash2 className="h-4 w-4" />
                              </IconActionButton>
                            </div>
                          </div>

                          {isExpanded ? (
                            <div className="rounded-2xl border border-border bg-[rgba(247,251,255,0.88)] p-3">
                              <div className="mb-2 flex items-center justify-between gap-2">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                  Task details
                                </p>
                                <button
                                  type="button"
                                  onClick={() => setExpandedTaskId(null)}
                                  className="text-xs font-medium text-muted-foreground transition hover:text-[#1745C7]"
                                >
                                  Done
                                </button>
                              </div>
                              <div className="grid gap-2 sm:grid-cols-[160px,minmax(0,1fr)]">
                                <select
                                  value={task.priority}
                                  onChange={(e) =>
                                    updateTaskMeta.mutate({
                                      task_id: task.id,
                                      priority: e.target.value as "high" | "medium" | "low"
                                    })
                                  }
                                  className="h-9 min-w-0 w-full rounded-xl border border-[hsl(var(--input))] bg-white px-3 text-sm"
                                >
                                  <option value="high">High</option>
                                  <option value="medium">Medium</option>
                                  <option value="low">Low</option>
                                </select>
                                <Input
                                  defaultValue={task.category ?? ""}
                                  onBlur={(e) => commitTaskCategory(task, e.currentTarget.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      commitTaskCategory(task, e.currentTarget.value);
                                      e.currentTarget.blur();
                                    }
                                  }}
                                  placeholder="Category"
                                  className="h-9 min-w-0"
                                />
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })()}
                </li>
              ))}
            </ul>
            {!visibleTasks.length ? (
              <p className="text-sm text-muted-foreground">
                {taskStats.total
                  ? "No tasks match the current filters."
                  : "No tasks planned yet. Add your first task to anchor the day."}
              </p>
            ) : null}
          </AutoSectionCard>
        );
      case "water":
        return (
          <AutoSectionCard title="Water Intake" itemCount={1} {...sectionProps}>
            <div className="rounded-[1.05rem] border border-border bg-[rgba(247,251,255,0.86)] p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">Hydration progress</p>
                  <p className="text-xs text-muted-foreground">Keep today's target visible and easy to update.</p>
                </div>
                <Badge>{effectiveWaterTarget} {effectiveWaterUnit}</Badge>
              </div>
              <div className="flex gap-2">
              <Input
                type="number"
                value={waterConsumed}
                onChange={(e) => setWaterConsumed(Number(e.target.value))}
                placeholder={`Consumed (${effectiveWaterUnit})`}
              />
              <Button onClick={() => saveWater.mutate()}>Save</Button>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Current: {daily.data?.entry.waterLog?.consumed ?? 0}/{effectiveWaterTarget} {effectiveWaterUnit}
              </p>
            </div>
          </AutoSectionCard>
        );
      case "habits":
        return (
          <AutoSectionCard title="Habits" itemCount={daily.data?.habits.length ?? 0} {...sectionProps}>
            {daily.data?.habits.length ? (
              <ul className="space-y-3 text-sm">
                {daily.data.habits.map((habit) => {
                  const log = daily.data?.habitLogs.find((h) => h.habitId === habit.id);
                  const isMeasurable = Boolean(habit.targetValue && habit.targetValue > 0);
                  return (
                    <li
                      key={habit.id}
                      className="rounded-[1.05rem] border border-border bg-white/90 p-3 shadow-[0_10px_22px_rgba(15,23,42,0.03)]"
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium leading-6">{habit.name}</p>
                          {isMeasurable ? (
                            <p className="text-xs text-muted-foreground">
                              Target: {habit.targetValue} {habit.targetUnit ?? ""}
                            </p>
                          ) : null}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {isMeasurable
                            ? `${log?.valueDone ?? 0}/${habit.targetValue} ${habit.targetUnit ?? ""}`
                            : log?.isDone
                              ? "done"
                              : "pending"}
                        </span>
                      </div>
                      {isMeasurable ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={habitValueDrafts[habit.id] ?? 0}
                            onChange={(e) =>
                              setHabitValueDrafts((prev) => ({
                                ...prev,
                                [habit.id]: Number(e.target.value)
                              }))
                            }
                            placeholder={`Target ${habit.targetValue}`}
                          />
                          <Button
                            onClick={() =>
                              toggleHabit.mutate({
                                habit_id: habit.id,
                                value_done: habitValueDrafts[habit.id] ?? 0
                              })
                            }
                          >
                            Save
                          </Button>
                        </div>
                      ) : (
                        <label className="flex items-center gap-2 rounded-xl border border-border bg-[rgba(247,251,255,0.72)] px-3 py-2">
                          <input
                            type="checkbox"
                            checked={Boolean(log?.isDone)}
                            onChange={(e) =>
                              toggleHabit.mutate({
                                habit_id: habit.id,
                                is_done: e.target.checked
                              })
                            }
                          />
                          <span className="text-sm text-muted-foreground">
                            {Boolean(log?.isDone) ? "Completed today" : "Mark as completed"}
                          </span>
                        </label>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No habits configured. Component is NA.</p>
            )}
          </AutoSectionCard>
        );
      case "for_tomorrow":
        return (
          <AutoSectionCard
            title="For Tomorrow Tasks"
            itemCount={tomorrowText.split("\n").map((x) => x.trim()).filter(Boolean).length}
            {...sectionProps}
          >
            <div className="rounded-[1.1rem] border border-border bg-white/90 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
              <Textarea
                rows={4}
                value={tomorrowText}
                onChange={(e) => setTomorrowText(e.target.value)}
                placeholder="One item per line"
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <Button onClick={() => saveEntry.mutate()} className="w-fit">
                  Save For Tomorrow
                </Button>
                {daily.data?.entry.tomorrowItems?.length ? (
                  <p className="text-xs text-muted-foreground">
                    Pending auto-move items: {daily.data.entry.tomorrowItems.length}
                  </p>
                ) : null}
              </div>
            </div>
          </AutoSectionCard>
        );
      case "notes":
        return (
          <AutoSectionCard
            title="Notes"
            itemCount={notesText.trim() ? 1 : 0}
            {...sectionProps}
          >
            <Textarea
              rows={4}
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              placeholder="Notes"
            />
            <Button onClick={() => saveEntry.mutate()} className="w-fit">
              Save Notes
            </Button>
          </AutoSectionCard>
        );
      case "exercise":
        return (
          <AutoSectionCard title="Exercise" itemCount={daily.data?.entry.exerciseLogs.length ?? 0} {...sectionProps}>
            <div className="rounded-[1.05rem] border border-border bg-[rgba(247,251,255,0.86)] p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
              <div className="mb-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_140px_110px]">
                <Input
                  value={exerciseType}
                  onChange={(e) => setExerciseType(e.target.value)}
                  placeholder="Type"
                />
                <Input
                  type="number"
                  value={exerciseMinutes}
                  onChange={(e) => setExerciseMinutes(Number(e.target.value))}
                  placeholder="Minutes"
                />
                <Button onClick={() => addExercise.mutate()}>Log</Button>
              </div>
              <ul className="text-sm">
              {daily.data?.entry.exerciseLogs.map((e) => (
                <li key={e.id} className="rounded-xl border border-border bg-white/80 px-3 py-2">
                  {e.type} - {e.minutes} min
                </li>
              ))}
              </ul>
            </div>
          </AutoSectionCard>
        );
      default:
        return null;
    }
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSectionOrder((current) => {
      const oldIndex = current.indexOf(active.id as SectionId);
      const newIndex = current.indexOf(over.id as SectionId);
      if (oldIndex < 0 || newIndex < 0) return current;
      return arrayMove(current, oldIndex, newIndex);
    });
  };

  function applyLayoutPreset(order: SectionId[]) {
    setSectionOrder(sanitizeSectionOrder(order));
  }

  function resetLayoutToDefault() {
    setSectionOrder([...DEFAULT_DAILY_SECTION_ORDER]);
  }

  function isEditing(section: EditableSection, id: string) {
    return activeEditor?.section === section && activeEditor.id === id;
  }

  function startInlineEdit(section: EditableSection, id: string, value: string) {
    if (section === "task") {
      setExpandedTaskId(id);
    }
    setActiveEditor({ section, id, value });
  }

  function setActiveEditorValue(value: string) {
    setActiveEditor((current) => (current ? { ...current, value } : current));
  }

  function cancelInlineEdit() {
    setActiveEditor(null);
  }

  function handleInlineEditKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>,
    onSave: () => void
  ) {
    if (event.key === "Enter") {
      event.preventDefault();
      onSave();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      cancelInlineEdit();
    }
  }

  function commitTaskEdit(task: { id: string; title: string }) {
    const nextTitle = activeEditor?.value.trim() ?? "";
    if (!nextTitle || nextTitle === task.title) {
      cancelInlineEdit();
      return;
    }

    updateTaskTitle.mutate({
      task_id: task.id,
      title: nextTitle
    });
  }

  function commitTaskCategory(
    task: { id: string; category: string | null },
    nextCategoryRaw: string
  ) {
    const nextCategory = nextCategoryRaw.trim() || null;
    if ((task.category ?? null) === nextCategory) {
      return;
    }

    updateTaskMeta.mutate({
      task_id: task.id,
      category: nextCategory
    });
  }

  function toggleTaskExpanded(taskId: string) {
    setExpandedTaskId((current) => (current === taskId ? null : taskId));
  }

  function commitGratitudeEdit(item: { id: string; text: string }) {
    const nextText = activeEditor?.value.trim() ?? "";
    if (!nextText || nextText === item.text) {
      cancelInlineEdit();
      return;
    }

    updateGratitude.mutate({
      item_id: item.id,
      text: nextText
    });
  }

  function commitTopWinEdit(index: number) {
    const nextValue = activeEditor?.value.trim() ?? "";
    if (!nextValue || topWinsItems[index] === nextValue) {
      cancelInlineEdit();
      return;
    }

    const nextTopWins = topWinsItems.map((item, idx) => (idx === index ? nextValue : item));
    setTopWinsItems(nextTopWins);
    saveEntrySections.mutate({ topWins: nextTopWins, quotes: quoteItems, grow: growText });
  }

  function commitQuoteEdit(index: number) {
    const nextValueRaw = activeEditor?.value.trim() ?? "";
    const nextValue = `"${nextValueRaw.replace(/^"+|"+$/g, "")}"`;
    if (!nextValueRaw || quoteItems[index] === nextValue) {
      cancelInlineEdit();
      return;
    }

    const nextQuotes = quoteItems.map((item, idx) => (idx === index ? nextValue : item));
    setQuoteItems(nextQuotes);
    saveEntrySections.mutate({ topWins: topWinsItems, quotes: nextQuotes, grow: growText });
  }

  function commitGrowEdit(index: number) {
    const nextValue = activeEditor?.value.trim() ?? "";
    const growItems = growText
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);
    if (!nextValue || growItems[index] === nextValue) {
      cancelInlineEdit();
      return;
    }

    const nextGrowItems = growItems.map((item, idx) => (idx === index ? nextValue : item));
    const nextGrowText = nextGrowItems.join("\n");
    setGrowText(nextGrowText);
    saveEntrySections.mutate({ topWins: topWinsItems, quotes: quoteItems, grow: nextGrowText });
  }

  function removeTopWin(index: number) {
    const nextTopWins = topWinsItems.filter((_, idx) => idx !== index);
    setTopWinsItems(nextTopWins);
    saveEntrySections.mutate({ topWins: nextTopWins, quotes: quoteItems, grow: growText });
  }

  function removeQuote(index: number) {
    const nextQuotes = quoteItems.filter((_, idx) => idx !== index);
    setQuoteItems(nextQuotes);
    saveEntrySections.mutate({ topWins: topWinsItems, quotes: nextQuotes, grow: growText });
  }

  function removeGrowItem(index: number) {
    const nextGrowItems = growText
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean)
      .filter((_, idx) => idx !== index);
    const nextGrowText = nextGrowItems.join("\n");
    setGrowText(nextGrowText);
    saveEntrySections.mutate({ topWins: topWinsItems, quotes: quoteItems, grow: nextGrowText });
  }

  if (dailySync.isLoading || daily.isLoading) {
    return (
      <main className="mx-auto max-w-[1600px] px-4 py-6">
        <Card>
          <p className="text-sm text-muted-foreground">Loading daily planner...</p>
        </Card>
      </main>
    );
  }

  if (dailySync.isError || daily.isError || !daily.data) {
    return (
      <main className="mx-auto max-w-[1600px] px-4 py-6">
        <Card>
          <p className="text-sm text-red-600">Failed to load daily planner. Please refresh and try again.</p>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1600px] space-y-5 px-4 py-6">
      {daily.data?.carryoverTasks?.length ? (
        <Card className="space-y-3 border-[hsl(var(--ring))]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">Unfinished Tasks Inbox</h2>
            <Button
              onClick={() =>
                carryoverAction.mutate({
                  action: "add_today",
                  task_ids: daily.data.carryoverTasks.map((task) => task.id)
                })
              }
              disabled={carryoverAction.isPending}
            >
              Add All To Today
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            You have {daily.data.carryoverTasks.length} incomplete tasks from previous days.
          </p>
          <ul className="space-y-2">
            {daily.data.carryoverTasks.map((task) => (
              <li key={task.id} className="rounded-md border border-border p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm">
                    <span className="font-medium">{task.title}</span>{" "}
                    <span className="text-muted-foreground">
                      ({task.priority}, from {task.sourceDate})
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      onClick={() =>
                        carryoverAction.mutate({
                          action: "add_today",
                          task_ids: [task.id]
                        })
                      }
                      disabled={carryoverAction.isPending}
                    >
                      Add To Today
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() =>
                        carryoverAction.mutate({
                          action: "dismiss",
                          task_ids: [task.id]
                        })
                      }
                      disabled={carryoverAction.isPending}
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    type="date"
                    className="w-[170px]"
                    value={carryoverDateDrafts[task.id] ?? (daily.data?.todayDate ?? selectedDate)}
                    onChange={(e) =>
                      setCarryoverDateDrafts((prev) => ({
                        ...prev,
                        [task.id]: e.target.value
                      }))
                    }
                  />
                  <Button
                    onClick={() =>
                      carryoverAction.mutate({
                        action: "reschedule",
                        task_ids: [task.id],
                        target_date: carryoverDateDrafts[task.id] ?? (daily.data?.todayDate ?? selectedDate)
                      })
                    }
                    disabled={carryoverAction.isPending}
                  >
                    Reschedule
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card className="overflow-hidden border-[hsl(var(--border)/0.95)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,250,255,0.95))]">
        <div className="grid gap-6 xl:grid-cols-[1.28fr,0.92fr]">
          <div className="space-y-5 rounded-[1.5rem] border border-[hsl(var(--border)/0.72)] bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(244,249,255,0.88))] p-6 shadow-[0_14px_36px_rgba(15,23,42,0.05)]">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Daily Focus</p>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-4xl font-semibold tracking-tight text-[hsl(var(--foreground))]">{completionHeadline}</h1>
                <Badge className="px-4 py-1.5 text-sm">{formatDayStatusLabel(daily.data?.dayStatus)}</Badge>
              </div>
              <p className="max-w-2xl text-[15px] leading-7 text-muted-foreground">
                {completionGuidance} Use this day view to capture your priorities, reflection, and consistency habits in one place.
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {focusSummary.map((item) => (
                <div
                  key={item}
                  className="rounded-full border border-border bg-white px-3.5 py-2 text-xs font-medium text-muted-foreground shadow-[0_8px_18px_rgba(15,23,42,0.04)]"
                >
                  {item}
                </div>
              ))}
            </div>

            <div className="grid gap-3 lg:grid-cols-[120px_minmax(0,1fr)_120px]">
              <Button variant="secondary" className="h-12 rounded-2xl" onClick={() => setSelectedDate((d) => shiftDate(d, -1))}>
                Prev
              </Button>
              <div className="grid gap-3 sm:grid-cols-[210px_minmax(170px,190px)]">
                <div className="rounded-[1.25rem] border border-border bg-white px-4 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Selected day</p>
                  <p className="mt-1 text-xl font-semibold">{selectedDateLabel}</p>
                </div>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="h-full min-h-[54px] rounded-[1.25rem]"
                />
              </div>
              <Button variant="secondary" className="h-12 rounded-2xl" onClick={() => setSelectedDate((d) => shiftDate(d, 1))}>
                Next
              </Button>
            </div>
          </div>

          <div className="space-y-4 rounded-[1.5rem] border border-[hsl(var(--border)/0.74)] bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(245,249,255,0.9))] p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Daily Score</p>
                <p className="text-xs text-muted-foreground">Live view of how today's sections are contributing.</p>
              </div>
              <span className="inline-flex h-11 min-w-[74px] items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#8ea2ea,#7a8ddd)] px-4 py-1 text-base font-semibold text-white shadow-[0_12px_24px_rgba(23,69,199,0.16)]">
                {score}%
              </span>
            </div>
            <Progress value={score} className="h-3" />
            <div className="grid gap-2 sm:grid-cols-2">
              {daily.data?.score.breakdown.map((item) => (
                <div
                  key={item.key}
                  className={`flex min-h-[42px] items-center justify-start rounded-[1rem] px-3.5 py-2 text-xs font-semibold shadow-[0_6px_18px_rgba(15,23,42,0.06)] ${
                    sectionState(item) === "completed"
                      ? "bg-[#1fd9b5] text-[#0a0087]"
                      : sectionState(item) === "pending"
                        ? "bg-[#5073D3] text-white"
                        : "bg-[#9E9E9E] text-white"
                  }`}
                  aria-label={`${item.key}: ${sectionPresentation(item)}`}
                >
                  {item.key}: {sectionPresentation(item)}
                </div>
              ))}
            </div>
            <div className="rounded-[1.2rem] border border-border bg-[rgba(0,176,255,0.04)] px-4 py-3.5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Today at a glance</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {reviewSummary.completedTasks}/{reviewSummary.totalTasks} tasks completed, {reviewSummary.gratitudeCount} gratitude
                item{reviewSummary.gratitudeCount === 1 ? "" : "s"}, and {reviewSummary.exerciseCount} exercise log
                {reviewSummary.exerciseCount === 1 ? "" : "s"}.
              </p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="space-y-4 border-[hsl(var(--border)/0.92)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,250,255,0.95))]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold">Arrange your daily workspace</p>
            <p className="text-sm leading-6 text-muted-foreground">
              Keep `Tasks` pinned at the top as your primary focus area, then drag and reorder the remaining sections below to fit your natural flow.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              className={
                hasUnsavedLayoutChanges
                  ? "bg-amber-100 text-amber-800"
                  : "bg-emerald-100 text-emerald-800"
              }
            >
              {saveLayout.isPending
                ? "Saving layout..."
                : hasUnsavedLayoutChanges
                  ? "Unsaved changes"
                  : "Layout saved"}
            </Badge>
            <Button variant="secondary" onClick={resetLayoutToDefault} disabled={isDefaultLayout}>
              Reset Layout
            </Button>
            <Button
              onClick={() => saveLayout.mutate()}
              disabled={saveLayout.isPending || !hasUnsavedLayoutChanges}
            >
              {saveLayout.isPending ? "Saving layout..." : "Save Layout"}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {DAILY_LAYOUT_PRESETS.map((preset) => (
            <Button
              key={preset.id}
              type="button"
              variant="secondary"
              className="rounded-full px-4"
              onClick={() => applyLayoutPreset(preset.order)}
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </Card>

      {showMorningPlanningCard ? (
        <Card className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Morning Planning</p>
                <h2 className="font-semibold">Start your day with a clear plan</h2>
              </div>
              <p className="max-w-3xl text-sm text-muted-foreground">{morningPrompt}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge>Carryover: {carryoverCount}</Badge>
              <Badge>Planned tasks: {reviewSummary.totalTasks}</Badge>
              <Badge>Day status: {formatDayStatusLabel(daily.data?.dayStatus)}</Badge>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
            <Card className="space-y-3">
              <h3 className="font-semibold">What matters most today?</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Before jumping into all sections, start with these reminders:</p>
                <ul className="space-y-2">
                  {morningChecklist.map((item) => (
                    <li key={item} className="rounded-md border border-border px-3 py-2">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Card>

            <Card className="space-y-3">
              <h3 className="font-semibold">Quick actions</h3>
              <div className="space-y-2">
                {carryoverCount > 0 ? (
                  <Button
                    className="w-full"
                    onClick={() =>
                      carryoverAction.mutate({
                        action: "add_today",
                        task_ids: daily.data?.carryoverTasks.map((task) => task.id) ?? []
                      })
                    }
                    disabled={carryoverAction.isPending}
                  >
                    Add All Carryover Tasks
                  </Button>
                ) : null}
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => {
                    if (!daily.data?.entry.tasks.length) {
                      const taskInput = document.querySelector<HTMLInputElement>('input[placeholder="Add task"]');
                      taskInput?.focus();
                    } else {
                      const firstIncomplete = daily.data.entry.tasks.find((task) => !task.isCompleted);
                      if (firstIncomplete) {
                        startInlineEdit("task", firstIncomplete.id, firstIncomplete.title);
                      }
                    }
                  }}
                >
                  {daily.data?.entry.tasks.length ? "Refocus On First Incomplete Task" : "Add First Task"}
                </Button>
                <Button variant="ghost" className="w-full" onClick={() => setIsReviewOpen(true)}>
                  Open End Of Day Review
                </Button>
              </div>
            </Card>
          </div>
        </Card>
      ) : null}

      <Card className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">End Of Day Review</h2>
            <p className="text-sm text-muted-foreground">
              Review unfinished tasks, save your reflections, and finalize this day.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {daily.data?.entry.closedAt ? (
              <Badge>Closed day</Badge>
            ) : null}
            <Button onClick={() => setIsReviewOpen((current) => !current)} disabled={isFutureDay}>
              {isReviewOpen ? "Hide Review" : daily.data?.entry.closedAt ? "Review Closed Day" : "Close My Day"}
            </Button>
          </div>
        </div>
        {isFutureDay ? (
          <p className="text-sm text-muted-foreground">
            End of day review is available for today and past days only.
          </p>
        ) : null}
        {isReviewOpen ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="space-y-3">
              <h3 className="font-semibold">Day Summary</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                <SummaryRow label="Daily score" value={`${score}%`} />
                <SummaryRow
                  label="Tasks"
                  value={`${reviewSummary.completedTasks}/${reviewSummary.totalTasks} completed`}
                />
                <SummaryRow
                  label="Water"
                  value={
                    reviewSummary.waterMet
                      ? "Target met"
                      : `${waterConsumed}/${effectiveWaterTarget} ${effectiveWaterUnit}`
                  }
                />
                <SummaryRow label="Exercise logs" value={String(reviewSummary.exerciseCount)} />
                <SummaryRow label="Gratitude items" value={String(reviewSummary.gratitudeCount)} />
                <SummaryRow label="Top wins" value={String(reviewSummary.topWinsCount)} />
              </div>
              {reflectionReminders.length ? (
                <div className="rounded-lg border border-border bg-muted/50 p-3 text-sm">
                  <p className="mb-2 font-medium">Reflection reminders</p>
                  <ul className="space-y-1 text-muted-foreground">
                    {reflectionReminders.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="rounded-lg border border-border bg-muted/50 p-3 text-sm text-emerald-700">
                  Reflection looks complete for this day.
                </p>
              )}
            </Card>

            <Card className="space-y-3">
              <h3 className="font-semibold">Unfinished Tasks</h3>
              {incompleteTasks.length ? (
                <ul className="space-y-3">
                  {incompleteTasks.map((task) => {
                    const action = closeActionDrafts[task.id] ?? "carry_to_tomorrow";
                    return (
                      <li key={task.id} className="rounded-lg border border-border p-3">
                        <p className="mb-2 text-sm font-medium">{task.title}</p>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant={action === "carry_to_tomorrow" ? "default" : "secondary"}
                            onClick={() =>
                              setCloseActionDrafts((prev) => ({
                                ...prev,
                                [task.id]: "carry_to_tomorrow"
                              }))
                            }
                          >
                            Carry To Tomorrow
                          </Button>
                          <Button
                            type="button"
                            variant={action === "dismiss" ? "default" : "secondary"}
                            onClick={() =>
                              setCloseActionDrafts((prev) => ({
                                ...prev,
                                [task.id]: "dismiss"
                              }))
                            }
                          >
                            Dismiss
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No unfinished tasks. You are ready to close the day.
                </p>
              )}
            </Card>

            <Card className="space-y-3 lg:col-span-2">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Closing the day will save your current reflection sections, process unfinished tasks,
                  and finalize the day status.
                </p>
                <Button onClick={() => closeDay.mutate()} disabled={closeDay.isPending || isFutureDay}>
                  {closeDay.isPending ? "Closing..." : "Confirm Close Day"}
                </Button>
              </div>
            </Card>
          </div>
        ) : null}
      </Card>

      <section className="mb-5">
        {renderSection("tasks")}
      </section>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={secondarySectionOrder} strategy={rectSortingStrategy}>
          <section className="grid items-start gap-5 md:grid-cols-2 xl:grid-cols-3">
            {secondarySectionOrder.map((id) => (
              <SortableSection key={id} id={id} className={sectionLayoutClass(id)}>
                {(dragHandle) => renderSection(id, dragHandle)}
              </SortableSection>
            ))}
          </section>
        </SortableContext>
      </DndContext>
    </main>
  );
}

function SortableSection({
  id,
  children,
  className
}: {
  id: SectionId;
  children: (dragHandle: ReactNode) => ReactNode;
  className?: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  const dragHandle = (
    <button
      type="button"
      {...attributes}
      {...listeners}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted/50 active:cursor-grabbing"
      title="Drag to reorder section"
      aria-label="Drag to reorder section"
    >
      <GripVertical className="h-4 w-4" />
      <span className="sr-only">Drag section</span>
    </button>
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`w-full self-start rounded-xl transition-all duration-200 ${className ?? ""} ${
        isDragging
          ? "z-10 scale-[0.99] opacity-75 shadow-md ring-2 ring-[hsl(var(--ring))]"
          : isOver
            ? "ring-2 ring-[hsl(var(--ring))] bg-muted/20"
            : ""
      }`}
    >
      {children(dragHandle)}
    </div>
  );
}

function IconActionButton({
  label,
  onClick,
  children
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-[hsl(var(--muted)/0.5)] hover:text-[#1745C7]"
    >
      {children}
    </button>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

function priorityClasses(priority: "high" | "medium" | "low") {
  if (priority === "high") {
    return "bg-red-100 text-red-700";
  }
  if (priority === "medium") {
    return "bg-amber-100 text-amber-700";
  }
  return "bg-sky-100 text-sky-700";
}

function capitalizeTaskPriority(priority: "high" | "medium" | "low") {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function sanitizeSectionOrder(layout: string[]): SectionId[] {
  const valid = new Set(DEFAULT_DAILY_SECTION_ORDER);
  const seen = new Set<SectionId>();
  const preferred: SectionId[] = [];
  for (const item of layout) {
    if (item === "journal") {
      if (!seen.has("for_tomorrow")) {
        seen.add("for_tomorrow");
        preferred.push("for_tomorrow");
      }
      if (!seen.has("notes")) {
        seen.add("notes");
        preferred.push("notes");
      }
      continue;
    }
    const sectionId = item as SectionId;
    if (!valid.has(sectionId) || seen.has(sectionId)) continue;
    seen.add(sectionId);
    preferred.push(sectionId);
  }
  const missing = DEFAULT_DAILY_SECTION_ORDER.filter((item) => !preferred.includes(item));
  const merged = [...preferred, ...missing].filter((item) => item !== "tasks");
  return ["tasks", ...merged];
}

function shiftDate(date: string, byDays: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + byDays);
  return d.toISOString().slice(0, 10);
}
