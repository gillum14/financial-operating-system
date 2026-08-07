import {
  Car,
  CreditCard,
  GraduationCap,
  Home,
  LifeBuoy,
  type LucideIcon,
  Plane,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";

import type { GoalHealth } from "@/application/goals/goal-calculations";
import type { GoalPriority, GoalType } from "@/domains/goals/types";
import { categoryTone, CATEGORY_COLOR_OPTIONS } from "@/lib/category-color";

export const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  "emergency-fund": "Emergency Fund",
  vacation: "Vacation",
  home: "Home",
  vehicle: "Vehicle",
  education: "Education",
  retirement: "Retirement",
  investment: "Investment",
  "debt-payoff": "Debt Payoff",
  "general-savings": "General Savings",
  custom: "Custom",
};

// Client-safe enumeration of every goal type, for select inputs — derived
// from GOAL_TYPE_LABELS' own keys rather than importing GOAL_TYPES from
// @/db/schema/goals, which "use client" components must never do (see
// architecture-boundaries.test.ts's forbidden-import check).
export const GOAL_TYPE_OPTIONS = Object.keys(GOAL_TYPE_LABELS) as GoalType[];

export const GOAL_TYPE_ICONS: Record<GoalType, LucideIcon> = {
  "emergency-fund": LifeBuoy,
  vacation: Plane,
  home: Home,
  vehicle: Car,
  education: GraduationCap,
  retirement: Wallet,
  investment: TrendingUp,
  "debt-payoff": CreditCard,
  "general-savings": Wallet,
  custom: Sparkles,
};

export const GOAL_HEALTH_LABELS: Record<GoalHealth, string> = {
  excellent: "Excellent",
  "on-track": "On Track",
  behind: "Behind",
  completed: "Completed",
};

export const GOAL_PRIORITY_LABELS: Record<GoalPriority, string> = {
  high: "High Priority",
  medium: "Medium Priority",
  low: "Low Priority",
};

// Client-safe enumeration of every priority, for select inputs — same
// reasoning as GOAL_TYPE_OPTIONS (never import GOAL_PRIORITIES from
// @/db/schema/goals in a "use client" component).
export const GOAL_PRIORITY_OPTIONS = Object.keys(GOAL_PRIORITY_LABELS) as GoalPriority[];

export function goalPriorityTone(priority: GoalPriority): string {
  switch (priority) {
    case "high":
      return "var(--danger)";
    case "medium":
      return "var(--foreground-muted)";
    case "low":
      return "var(--foreground-muted)";
  }
}

// Reuses the same swatch set as Categories' color picker (Add/Edit Goal
// dialog offers the identical fixed palette) — no separate goal palette
// invented for what is visually the same "pick an accent color" control.
export const GOAL_COLOR_OPTIONS = CATEGORY_COLOR_OPTIONS;

// A goal's own stored color if it has one, otherwise the same deterministic
// name-hash fallback every other unthemed entity in the app uses.
export function resolveGoalColor(goal: { title: string; color: string | null }): string {
  return goal.color ?? categoryTone(goal.title);
}

export function goalHealthTone(health: GoalHealth): string {
  switch (health) {
    case "excellent":
      return "var(--success)";
    case "on-track":
      return "var(--primary)";
    case "behind":
      return "var(--danger)";
    case "completed":
      return "var(--foreground-muted)";
  }
}
