import {
  ACCOUNT_BALANCE_SNAPSHOT_TYPES,
  type AccountBalanceSnapshot,
  type AccountBalanceSnapshotType,
  type NewAccountBalanceSnapshot,
} from "@/db/schema/net-worth-snapshots";

export { ACCOUNT_BALANCE_SNAPSHOT_TYPES };
export type { AccountBalanceSnapshot, AccountBalanceSnapshotType };

// Never id/createdAt (server-generated) — and deliberately no update/delete
// input types at all, unlike every other domain in this codebase: this
// table has no legitimate post-creation write path, so there is nothing
// for an UpdateInput to describe.
export type AccountBalanceSnapshotCreateInput = Omit<NewAccountBalanceSnapshot, "id" | "createdAt">;
