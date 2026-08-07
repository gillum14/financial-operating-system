import { date, index, numeric, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { accounts, type AccountBalanceSource, type AccountType } from "./accounts";
import { users } from "./users";

// "monthly" = the deterministic scheduled capture (see net-worth-model.md
// §13); "manual" = an explicit owner/dev-triggered capture (material-event
// capture per the product spec's hybrid model, or the dev verification
// path documented in the capture service — this V1 has no automated
// material-event detector, so every non-monthly snapshot is "manual"
// regardless of what prompted it).
export const ACCOUNT_BALANCE_SNAPSHOT_TYPES = ["monthly", "manual"] as const;
export type AccountBalanceSnapshotType = (typeof ACCOUNT_BALANCE_SNAPSHOT_TYPES)[number];

// Immutable historical balance snapshot, one row per (account, calendar
// date). Deliberately NOT spread with the usual `...timestamps` shared
// columns: this table has no updatedAt and no deletedAt by design — a
// snapshot is either exactly what was captured or it does not exist,
// never edited and never soft-deleted (net-worth-model.md §19: "Athena
// must never modify historical snapshots"). createdAt is the one
// timestamp that legitimately applies (when the row was written), not a
// mutation marker.
//
// accountType and balanceSource are deliberately denormalized copies of
// the account's state *at capture time*, not a live join to `accounts` —
// an account's type can change or the account can be archived after a
// snapshot exists, and historical reconstruction must never depend on a
// possibly-since-changed live row (this is the "account type/classification
// metadata required to reconstruct Net Worth accurately" the spec calls
// for). Net Worth history is derived from these rows at read time by
// running the same classification the current-balance path uses
// (net-worth-breakdown.ts) — there is no separate stored net-worth
// aggregate table; see that file's shared core computation.
export const accountBalanceSnapshots = pgTable(
  "account_balance_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    snapshotDate: date("snapshot_date", { mode: "string" }).notNull(),
    balance: numeric("balance", { precision: 19, scale: 4, mode: "string" }).notNull(),
    accountType: text("account_type").$type<AccountType>().notNull(),
    balanceSource: text("balance_source").$type<AccountBalanceSource>().notNull(),
    snapshotType: text("snapshot_type").$type<AccountBalanceSnapshotType>().notNull().default("monthly"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("account_balance_snapshots_owner_id_idx").on(table.ownerId),
    index("account_balance_snapshots_account_id_idx").on(table.accountId),
    // Primary read pattern: "every snapshot row for this owner across all
    // accounts, ordered by date" — used to build the Net Worth history
    // series without a per-account fan-out query.
    index("account_balance_snapshots_owner_date_idx").on(table.ownerId, table.snapshotDate),
    // Idempotent capture: a second capture for the same (account, date)
    // is a no-op via onConflictDoNothing, never a second row and never an
    // overwrite of the first. No partial WHERE clause (unlike
    // goal_allocations' active-row unique index) — there is no deletedAt
    // to scope around; this index is unconditional.
    uniqueIndex("account_balance_snapshots_account_date_idx").on(table.accountId, table.snapshotDate),
  ],
);

export type AccountBalanceSnapshot = typeof accountBalanceSnapshots.$inferSelect;
export type NewAccountBalanceSnapshot = typeof accountBalanceSnapshots.$inferInsert;
