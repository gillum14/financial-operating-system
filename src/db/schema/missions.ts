import { boolean, index, jsonb, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { accounts } from "./accounts";
import { budgetPeriods } from "./budgets";
import { goals } from "./goals";
import { timestamps } from "./shared-columns";
import { users } from "./users";

// Six deterministic, real-data-backed V1 mission types, plus "custom" —
// deliberately still a small, closed set, not the docs' much larger
// catalog (Awareness/Habit/Investment/Retirement/Lifestyle/Education/
// Milestone/Household). The first six are each backed by real,
// already-implemented domain data and evaluated automatically (see
// mission-calculations.ts). "custom" is different in kind, not degree: a
// user-authored mission with no real-data source to check, so it is never
// eligibility-detected and never auto-completed — it uses the "User
// Confirmed" verification tier missions-specification.md §7 documents for
// exactly this case (Athena cannot independently verify completion; the
// user marks it done themselves). It is the only mission type in this
// system not backed by live financial data, and every surface that
// displays it says so.
export const MISSION_TYPES = [
  "stay-within-budget",
  "fund-emergency-fund",
  "reach-savings-goal",
  "categorize-transactions",
  "reduce-debt",
  "improve-confidence",
  "custom",
] as const;
export type MissionType = (typeof MISSION_TYPES)[number];

// No "available" or "suggested" state here — eligibility is computed live
// by mission-eligibility.ts and never persisted; a row in this table only
// ever exists once a user has explicitly started a mission (Mission
// Engine V1 product decision — see this branch's PR description for the
// full rationale). No "paused"/"dismissed" either — out of scope for V1.
export const MISSION_STATUSES = ["active", "completed", "archived"] as const;
export type MissionStatus = (typeof MISSION_STATUSES)[number];

// The Mission Progression System's difficulty tiers — see
// progression-calculations.ts's MISSION_TYPE_DIFFICULTY for the fixed
// mapping from each MissionType to one of these, and XP_BY_DIFFICULTY for
// the point values. "custom" missions don't use this table; they're a
// flat, separately-capped value (see that file).
export const MISSION_DIFFICULTIES = ["easy", "medium", "hard", "major-milestone"] as const;
export type MissionDifficulty = (typeof MISSION_DIFFICULTIES)[number];

// Represents a user-started, deterministically-evaluated financial
// mission. A mission never stores its own progress number — progress is
// always recomputed live from the real domain data it's tied to
// (mission-calculations.ts), the same way Goal/Budget progress is never a
// stored column either. What IS stored here is the immutable snapshot
// captured the moment the mission was started: which real entity it's
// tied to, and the starting/target values progress is measured against.
export const missions = pgTable(
  "missions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    missionType: text("mission_type").$type<MissionType>().notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    status: text("status").$type<MissionStatus>().notNull().default("active"),

    // Exactly one of these three is set, depending on missionType — never
    // more than one, never a generic/polymorphic reference. Real foreign
    // keys (not a string+type pair) so a mission can never point at a
    // nonexistent or another owner's row.
    relatedGoalId: uuid("related_goal_id").references(() => goals.id, { onDelete: "set null" }),
    relatedAccountId: uuid("related_account_id").references(() => accounts.id, { onDelete: "set null" }),
    relatedBudgetPeriodId: uuid("related_budget_period_id").references(() => budgetPeriods.id, { onDelete: "set null" }),

    // Only categorize-transactions uses this: the exact set of transaction
    // ids that were uncategorized at the moment this mission was started —
    // the "target set" missions-specification.md §8 requires ("progress
    // should not be inferred from unrelated activity"). A transaction
    // categorized after the mission started counts; one that becomes
    // uncategorized later (or is imported after) never retroactively joins
    // this mission's scope.
    relatedTransactionIds: jsonb("related_transaction_ids").$type<string[]>(),

    // The immutable baseline/target snapshot captured at start — see
    // mission-calculations.ts for exactly how each missionType uses these.
    startValue: numeric("start_value", { precision: 19, scale: 4, mode: "string" }),
    targetValue: numeric("target_value", { precision: 19, scale: 4, mode: "string" }),
    // improve-confidence only: the band id ("stable", "strong", ...) that
    // was the "next band up" at start time — display label only; the
    // actual completion check uses targetValue (that band's numeric min
    // score).
    targetBandId: text("target_band_id"),

    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    // Set exactly once, by the one auto-completion transition
    // (MissionService's evaluate-and-complete path) — never cleared, never
    // reset by a later re-evaluation (mission completion is permanent:
    // once verified, a mission stays completed even if the underlying
    // financial state later reverses).
    completedAt: timestamp("completed_at", { withTimezone: true }),

    // ---- Mission Progression System (locked at start, never edited) ----
    // Every mission except "custom" gets a fixed difficulty from
    // MISSION_TYPE_DIFFICULTY; custom missions store null here and are
    // awarded a flat capped XP value instead (see progression-
    // calculations.ts). xpValue is captured as a real number at the exact
    // moment this row is created — not re-derived from difficulty at
    // award time — so a future change to the XP-per-difficulty table can
    // never retroactively change what an already-started mission is
    // worth. isDailyMission records whether this mission was started from
    // the Daily Mission spotlight, for the one-time +25 XP bonus at
    // completion.
    difficulty: text("difficulty").$type<MissionDifficulty>(),
    xpValue: numeric("xp_value", { precision: 10, scale: 0, mode: "number" }).notNull(),
    isDailyMission: boolean("is_daily_mission").notNull().default(false),

    ...timestamps,
  },
  (table) => [
    index("missions_owner_id_idx").on(table.ownerId),
    index("missions_owner_status_idx").on(table.ownerId, table.status),
    index("missions_related_goal_id_idx").on(table.relatedGoalId),
    index("missions_related_account_id_idx").on(table.relatedAccountId),
    index("missions_related_budget_period_id_idx").on(table.relatedBudgetPeriodId),
  ],
);

export type Mission = typeof missions.$inferSelect;
export type NewMission = typeof missions.$inferInsert;
