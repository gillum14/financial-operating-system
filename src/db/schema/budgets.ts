import { sql } from "drizzle-orm";
import { date, index, integer, numeric, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { categories } from "./categories";
import { timestamps } from "./shared-columns";
import { users } from "./users";

// Budget Period is the aggregate root (see docs/architecture/domain-model.md
// §Budgets "Aggregate Boundary") — there is deliberately no separate
// top-level "Budget" wrapper entity. The model doc's conceptual "Budget"
// (Budget Name, Budget Type, Default Period) exists to support switching
// between period types later (quarterly/annual/custom are explicitly
// "future" per budgets-specification.md §5); with only monthly periods in
// V1, that wrapper would carry no distinguishing behavior — the same
// reasoning already applied to Categories' deferred categoryType/icon
// fields ("pure UI/organizational metadata with no defined behavior").
export const BUDGET_PERIOD_STATUSES = ["draft", "active", "completed", "archived"] as const;
export type BudgetPeriodStatus = (typeof BUDGET_PERIOD_STATUSES)[number];

export const budgetPeriods = pgTable(
  "budget_periods",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    // Plain calendar dates (YYYY-MM-DD, no time component) — the same
    // timezone-safe pattern as transactions.transactionDate/accounts.
    // openingDate. A period boundary is a calendar concept, not an instant;
    // storing it as `date` rather than `timestamptz` sidesteps timezone
    // ambiguity entirely rather than requiring careful UTC handling.
    periodStart: date("period_start", { mode: "string" }).notNull(),
    periodEnd: date("period_end", { mode: "string" }).notNull(),
    status: text("status").$type<BudgetPeriodStatus>().notNull().default("draft"),
    ...timestamps,
  },
  (table) => [
    index("budget_periods_owner_id_idx").on(table.ownerId),
    index("budget_periods_owner_status_idx").on(table.ownerId, table.status),
    // Model doc §Safety and Validation Rules: "One active budget period per
    // schedule." A partial unique index (same technique as
    // users.users_email_active_unique_idx) enforces this at the database
    // level rather than trusting application code alone — activating a
    // second period while one is already active fails closed with a
    // constraint violation, not a silent inconsistency.
    uniqueIndex("budget_periods_one_active_per_owner_idx")
      .on(table.ownerId)
      .where(sql`status = 'active' AND deleted_at IS NULL`),
  ],
);

export type BudgetPeriod = typeof budgetPeriods.$inferSelect;
export type NewBudgetPeriod = typeof budgetPeriods.$inferInsert;

// Assigns a planned amount to a canonical Category for one Budget Period.
// Savings/investment categories are valid allocation targets like any
// other — zero-based budgeting treats "money assigned to savings" as a
// purpose, not spending (budgets-specification.md §4). No category-type
// restriction exists here by design.
export const budgetAllocations = pgTable(
  "budget_allocations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    budgetPeriodId: uuid("budget_period_id")
      .notNull()
      .references(() => budgetPeriods.id, { onDelete: "restrict" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    plannedAmount: numeric("planned_amount", { precision: 19, scale: 4, mode: "string" }).notNull(),
    // Deterministic display order, server-computed (append-to-end on
    // create) — same convention as categories.sortOrder, never
    // client-supplied directly.
    displayOrder: integer("display_order").notNull().default(0),
    ...timestamps,
  },
  (table) => [
    index("budget_allocations_owner_id_idx").on(table.ownerId),
    index("budget_allocations_period_id_idx").on(table.budgetPeriodId),
    index("budget_allocations_category_id_idx").on(table.categoryId),
    // One active allocation per (period, category) — prevents ambiguous
    // duplicate allocations to the same category within a period. Scoped
    // to non-deleted rows so a removed-then-re-added category doesn't
    // permanently collide with its own soft-deleted history.
    uniqueIndex("budget_allocations_period_category_active_idx")
      .on(table.budgetPeriodId, table.categoryId)
      .where(sql`deleted_at IS NULL`),
  ],
);

export type BudgetAllocation = typeof budgetAllocations.$inferSelect;
export type NewBudgetAllocation = typeof budgetAllocations.$inferInsert;

// Immutable, insert-only audit log — one row per change to an allocation's
// planned amount (budgets-model.md §8 Budget Adjustment: "Adjustments
// preserve historical planning decisions... They never modify transaction
// history"). No updatedAt/deletedAt: an adjustment record is never
// mutated or removed once written, unlike every other owned table here.
export const budgetAllocationAdjustments = pgTable(
  "budget_allocation_adjustments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    budgetAllocationId: uuid("budget_allocation_id")
      .notNull()
      .references(() => budgetAllocations.id, { onDelete: "restrict" }),
    previousAmount: numeric("previous_amount", { precision: 19, scale: 4, mode: "string" }).notNull(),
    newAmount: numeric("new_amount", { precision: 19, scale: 4, mode: "string" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("budget_allocation_adjustments_owner_id_idx").on(table.ownerId),
    index("budget_allocation_adjustments_allocation_id_idx").on(table.budgetAllocationId),
  ],
);

export type BudgetAllocationAdjustment = typeof budgetAllocationAdjustments.$inferSelect;
export type NewBudgetAllocationAdjustment = typeof budgetAllocationAdjustments.$inferInsert;
