import type { AccountBalanceSnapshot, AccountBalanceSnapshotCreateInput } from "./types";

export interface AccountBalanceSnapshotRepository {
  getByIdForOwner(id: string, ownerId: string): Promise<AccountBalanceSnapshot | null>;
  // Every snapshot row for this owner across all accounts, oldest first —
  // the primary read for building a Net Worth history series (grouped by
  // snapshotDate at the calculation layer, not here).
  listForOwner(ownerId: string): Promise<AccountBalanceSnapshot[]>;
  // One account's own history, oldest first — the per-account balance
  // trend / account-level delta read.
  listForOwnerAndAccount(ownerId: string, accountId: string): Promise<AccountBalanceSnapshot[]>;
  // Idempotent batch capture: a (accountId, snapshotDate) pair that
  // already exists is silently skipped (ON CONFLICT DO NOTHING), never
  // overwritten — this table has no update path. Returns only the rows
  // actually inserted, so callers (SnapshotCaptureService) can report how
  // many were newly captured vs. already present without a second query.
  createMany(inputs: AccountBalanceSnapshotCreateInput[]): Promise<AccountBalanceSnapshot[]>;
}
