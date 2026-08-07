import { sql } from "drizzle-orm";
import { date, index, integer, numeric, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { accounts } from "./accounts";
import { categories } from "./categories";
import { timestamps } from "./shared-columns";
import { users } from "./users";

// A single lifecycle enum rather than separate boolean flags — Active,
// Paused, Completed, and Archived are mutually exclusive display states in
// docs/products/goals-specification.md §4 (a goal is being worked toward,
// temporarily paused, done, or put away — never more than one at once),
// and a single enum makes that exclusivity structural instead of requiring
// application code to keep multiple columns in sync. Paused sits between
// Active and Archived: unlike Archived, a paused goal is expected to
// resume and is excluded only from active-goal summary metrics, not from
// totals. Draft/Cancelled from goals-model.md §3's fuller 5-state lifecycle
// remain out of scope.
export const GOAL_STATUSES = ["active", "paused", "completed", "archived"] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];

// V1 priority is used only for ordering/selection (see goal-calculations.ts's
// deriveUpcomingObjectives) — no scoring or urgency formula is derived from
// it, per the task's explicit instruction not to invent one.
export const GOAL_PRIORITIES = ["high", "medium", "low"] as const;
export type GoalPriority = (typeof GOAL_PRIORITIES)[number];

export const GOAL_TYPES = [
  "emergency-fund",
  "vacation",
  "home",
  "vehicle",
  "education",
  "retirement",
  "investment",
  "debt-payoff",
  "general-savings",
  "custom",
] as const;
export type GoalType = (typeof GOAL_TYPES)[number];

// ADR-0003's Goal Allocation Model is now implemented via goal_allocations
// below (many-to-many goal<->account, overallocation-safe). categoryId and
// this table's own accountId remain what they always were: optional,
// inert reference/display links, never used in progress math — the
// accountId here is a lightweight "primary suggested account" hint,
// entirely separate from the funding relationship goal_allocations
// expresses. See domain-model.md's Financial Goal invariant: "Goals must
// remain distinguishable from budget allocations."
export const goals = pgTable(
  "goals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    // Optional, inert reference links — never used in progress math. See
    // domain-model.md's Financial Goal invariant: "Goals must remain
    // distinguishable from budget allocations." A goal's categoryId is a
    // separate pointer at a Category row, never at a budget_allocations row.
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    accountId: uuid("account_id").references(() => accounts.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    description: text("description"),
    targetAmount: numeric("target_amount", { precision: 19, scale: 4, mode: "string" }).notNull(),
    // Plain calendar date, no time component — same reasoning as
    // budget_periods.period_start (a target date is a calendar concept).
    targetDate: date("target_date", { mode: "string" }),
    goalType: text("goal_type").$type<GoalType>().notNull(),
    status: text("status").$type<GoalStatus>().notNull().default("active"),
    priority: text("priority").$type<GoalPriority>().notNull().default("medium"),
    icon: text("icon"),
    color: text("color"),
    // Deterministic display order, server-computed (append-to-end on
    // create) — same convention as categories.sortOrder/budget_allocations.
    // display_order, never client-supplied directly.
    displayOrder: integer("display_order").notNull().default(0),
    // Set only by the explicit completeGoal transition, never automatically
    // when contributions happen to reach the target — mirrors
    // BudgetService's explicit lifecycle-transition methods.
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("goals_owner_id_idx").on(table.ownerId),
    index("goals_owner_status_idx").on(table.ownerId, table.status),
    index("goals_category_id_idx").on(table.categoryId),
    index("goals_account_id_idx").on(table.accountId),
  ],
);

export type Goal = typeof goals.$inferSelect;
export type NewGoal = typeof goals.$inferInsert;

// V1 only ever writes "manual" — the schema stays extensible for future
// funding sources (account allocation, automatic transfer, investment
// growth, CD maturity) named in goals-specification.md §8 without a
// migration being required to add them later.
export const GOAL_CONTRIBUTION_SOURCES = ["manual"] as const;
export type GoalContributionSource = (typeof GOAL_CONTRIBUTION_SOURCES)[number];

// Contribution rows are themselves the primary historical record of a
// goal's funding — unlike budget_allocation_adjustments (an audit log of
// changes to an ongoing mutable plan), a contribution is a discrete event
// in its own right, closer to a Transaction than to an adjustment log. It
// therefore gets full mutable timestamps (edit/soft-delete are real
// workflows here) rather than budget_allocation_adjustments' insert-only
// shape. "Immutable history" is satisfied by never hard-deleting: removal
// is deleted_at, so every contribution ever recorded — including removed
// ones — remains permanently in the table. current_amount on a Goal is
// never a stored column; it is always SUM(amount) WHERE deleted_at IS NULL,
// computed at read time (see goal-calculations.ts).
export const goalContributions = pgTable(
  "goal_contributions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    goalId: uuid("goal_id")
      .notNull()
      .references(() => goals.id, { onDelete: "restrict" }),
    // Always positive — Goals V1 has no withdrawal/negative-contribution
    // concept (goals-specification.md §10: "No negative goal values").
    amount: numeric("amount", { precision: 19, scale: 4, mode: "string" }).notNull(),
    contributionDate: date("contribution_date", { mode: "string" }).notNull(),
    note: text("note"),
    source: text("source").$type<GoalContributionSource>().notNull().default("manual"),
    ...timestamps,
  },
  (table) => [
    index("goal_contributions_owner_id_idx").on(table.ownerId),
    index("goal_contributions_goal_id_idx").on(table.goalId),
  ],
);

export type GoalContribution = typeof goalContributions.$inferSelect;
export type NewGoalContribution = typeof goalContributions.$inferInsert;

// ADR-0003 Goal Allocation Model: "Goal progress is calculated from
// allocations rather than account balances. Money is never moved when
// allocating funds to a goal." An allocation is a many-to-many claim
// between one Goal and one funding-source Account — a many-to-many table,
// never a field on either side. "One Dollar May Only Be Allocated Once"
// (ADR-0003) is enforced by trigger_check_goal_allocation_no_overallocation
// (see the RLS/trigger migration), not solely at the application layer —
// see goal-calculations.ts / GoalService.allocateFunds for the app-level
// (proactive, friendlier-error) half of that same invariant.
//
// One active row per (goal, account) pair — "editing" which amount a goal
// receives from a given account is an UPDATE on that row, not a second
// row; re-allocating after removal is a new row (the partial unique index
// below is scoped to non-deleted rows for exactly that reason), matching
// budget_allocations' one-active-allocation-per-(period,category)
// convention exactly.
export const goalAllocations = pgTable(
  "goal_allocations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    goalId: uuid("goal_id")
      .notNull()
      .references(() => goals.id, { onDelete: "restrict" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    // Always positive — an allocation removes funds from "available to
    // allocate" for its account, it never represents a withdrawal or a
    // negative claim.
    amount: numeric("amount", { precision: 19, scale: 4, mode: "string" }).notNull(),
    ...timestamps,
  },
  (table) => [
    index("goal_allocations_owner_id_idx").on(table.ownerId),
    index("goal_allocations_goal_id_idx").on(table.goalId),
    index("goal_allocations_account_id_idx").on(table.accountId),
    uniqueIndex("goal_allocations_goal_account_active_idx")
      .on(table.goalId, table.accountId)
      .where(sql`deleted_at IS NULL`),
  ],
);

export type GoalAllocation = typeof goalAllocations.$inferSelect;
export type NewGoalAllocation = typeof goalAllocations.$inferInsert;
