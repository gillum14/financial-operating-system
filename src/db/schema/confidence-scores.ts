import { date, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { users } from "./users";

// Mirrors account_balance_snapshots' capture-type convention exactly (see
// net-worth-snapshots.ts) — no scheduler exists in this codebase yet, so
// every snapshot is "manual" (an explicit owner/dev-triggered capture)
// regardless of what prompted it. "monthly" is reserved for the same
// future scheduled job Net Worth's capture path documents, not built here.
export const CONFIDENCE_SCORE_SNAPSHOT_TYPES = ["monthly", "manual"] as const;
export type ConfidenceScoreSnapshotType = (typeof CONFIDENCE_SCORE_SNAPSHOT_TYPES)[number];

// Immutable historical Confidence Score snapshot, one row per (owner,
// calendar date) — the Confidence Engine's equivalent of account_balance_
// snapshots. Deliberately NOT spread with the usual `...timestamps` shared
// columns: no updatedAt, no deletedAt. A snapshot is exactly what was
// computed at capture time or it does not exist; it is never edited or
// soft-deleted (same immutability rationale as Net Worth's historical
// snapshots — confidence-engine.md's "Transparency over Mystery" principle
// requires that a past score can never quietly change underneath a user).
//
// pillarScores stores each pillar's 0-100 score (or null if that pillar
// was unavailable at capture time) at the moment of capture — this is what
// makes a real, deterministic pillar-level trend possible later
// (current live pillar score vs. this stored value) without recomputing
// history from scratch or fabricating a full historical re-run of every
// cross-domain input. overallScore/band are the same top-line numbers the
// Dashboard/Confidence Engine UI renders. Nothing here is ever seeded with
// a hardcoded value — every row is the real output of
// computeConfidenceScore() at the time it was captured.
export const confidenceScoreSnapshots = pgTable(
  "confidence_score_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    snapshotDate: date("snapshot_date", { mode: "string" }).notNull(),
    // Nullable: honest, not fabricated — an owner with zero measurable
    // pillars (no accounts, no transactions, no goals, no budget) has no
    // knowable overall score yet, not a fake 0 or 50.
    overallScore: integer("overall_score"),
    band: text("band"),
    // Record<ConfidencePillarId, number | null> — see
    // confidence-calculations.ts's PILLAR_IDS for the exact key set.
    pillarScores: jsonb("pillar_scores").notNull().$type<Record<string, number | null>>(),
    snapshotType: text("snapshot_type").$type<ConfidenceScoreSnapshotType>().notNull().default("manual"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("confidence_score_snapshots_owner_id_idx").on(table.ownerId),
    // Both the primary read pattern ("this owner's snapshots, ordered by
    // date" — the trend/comparison-point lookup) and idempotent capture
    // (a second capture for the same (owner, date) is a no-op via
    // onConflictDoNothing, never a second row) — one unique index serves
    // both, so there's no separate plain index duplicating the same
    // column pair.
    uniqueIndex("confidence_score_snapshots_owner_date_idx").on(table.ownerId, table.snapshotDate),
  ],
);

export type ConfidenceScoreSnapshot = typeof confidenceScoreSnapshots.$inferSelect;
export type NewConfidenceScoreSnapshot = typeof confidenceScoreSnapshots.$inferInsert;
