import { date, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { missions } from "./missions";
import { users } from "./users";

// The 8 initial rewards — a fixed, closed set for V1, each with a
// deterministic unlock rule (see progression-calculations.ts's
// REWARD_DEFINITIONS). Not user-configurable, not AI-suggested.
export const MISSION_REWARD_KEYS = [
  "first-step",
  "momentum",
  "building-habits",
  "on-a-roll",
  "consistency",
  "level-up",
  "financial-builder",
  "major-win",
] as const;
export type MissionRewardKey = (typeof MISSION_REWARD_KEYS)[number];

// One row per owner — the persistent XP/streak summary the Missions page's
// summary tiles read directly. Level is deliberately NOT a column: it's
// always derived from totalXp (see computeLevel in progression-
// calculations.ts), so it can never drift out of sync with the number it's
// supposed to represent.
export const missionProgression = pgTable("mission_progression", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "restrict" }),
  totalXp: integer("total_xp").notNull().default(0),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  completedMissionCount: integer("completed_mission_count").notNull().default(0),
  // The calendar date (owner-agnostic UTC, same convention as every other
  // plain `date` column in this schema) of the most recent completion that
  // counted toward the streak — the one piece of state the one-grace-day
  // rule needs to evaluate the next completion against.
  lastQualifyingCompletionDate: date("last_qualifying_completion_date", { mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type MissionProgression = typeof missionProgression.$inferSelect;
export type NewMissionProgression = typeof missionProgression.$inferInsert;

// Immutable, insert-only XP ledger — one row per mission completion,
// never per owner. The unique index on missionId is what makes "XP is
// only ever awarded once per mission" a database-enforced guarantee, not
// just an application-level convention: a second attempt to record XP for
// the same mission fails at the constraint, not just "usually doesn't
// happen because the code path only runs once."
export const missionXpEvents = pgTable(
  "mission_xp_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    missionId: uuid("mission_id")
      .notNull()
      .references(() => missions.id, { onDelete: "restrict" }),
    // Split rather than one combined total: baseXp is the mission's own
    // locked xpValue (missions.xp_value) at the moment it completed;
    // bonusXp is the +25 Daily Mission bonus (0 when not applicable) — kept
    // separate so a later reader can see exactly why a completion was
    // worth what it was worth, never just a single opaque number.
    baseXp: integer("base_xp").notNull(),
    bonusXp: integer("bonus_xp").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("mission_xp_events_owner_id_idx").on(table.ownerId),
    uniqueIndex("mission_xp_events_mission_id_idx").on(table.missionId),
  ],
);

export type MissionXpEvent = typeof missionXpEvents.$inferSelect;
export type NewMissionXpEvent = typeof missionXpEvents.$inferInsert;

// Immutable, insert-only unlock record — once earned, never revoked
// (missions-model.md §18 "Completion and Reward Finality": "Earned
// rewards remain"). The unique (owner, rewardKey) index is what makes
// unlocking idempotent: re-checking eligibility after every completion is
// safe to do unconditionally, because a reward that's already unlocked
// simply fails the uniqueness check on a repeat insert attempt (caught
// and ignored, never surfaced as an error to the caller).
export const missionRewards = pgTable(
  "mission_rewards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    rewardKey: text("reward_key").$type<MissionRewardKey>().notNull(),
    unlockedAt: timestamp("unlocked_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("mission_rewards_owner_id_idx").on(table.ownerId),
    uniqueIndex("mission_rewards_owner_reward_idx").on(table.ownerId, table.rewardKey),
  ],
);

export type MissionReward = typeof missionRewards.$inferSelect;
export type NewMissionReward = typeof missionRewards.$inferInsert;
