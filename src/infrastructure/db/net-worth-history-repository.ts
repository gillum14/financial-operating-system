import { and, asc, eq } from "drizzle-orm";

import type { DbClient } from "@/db/client";
import { accountBalanceSnapshots } from "@/db/schema";
import type { AccountBalanceSnapshotRepository } from "@/domains/net-worth-history/repository";
import type { AccountBalanceSnapshot, AccountBalanceSnapshotCreateInput } from "@/domains/net-worth-history/types";

export class DrizzleAccountBalanceSnapshotRepository implements AccountBalanceSnapshotRepository {
  constructor(private readonly db: DbClient) {}

  async getByIdForOwner(id: string, ownerId: string): Promise<AccountBalanceSnapshot | null> {
    const [row] = await this.db
      .select()
      .from(accountBalanceSnapshots)
      .where(and(eq(accountBalanceSnapshots.id, id), eq(accountBalanceSnapshots.ownerId, ownerId)))
      .limit(1);
    return row ?? null;
  }

  async listForOwner(ownerId: string): Promise<AccountBalanceSnapshot[]> {
    return this.db
      .select()
      .from(accountBalanceSnapshots)
      .where(eq(accountBalanceSnapshots.ownerId, ownerId))
      .orderBy(asc(accountBalanceSnapshots.snapshotDate));
  }

  async listForOwnerAndAccount(ownerId: string, accountId: string): Promise<AccountBalanceSnapshot[]> {
    return this.db
      .select()
      .from(accountBalanceSnapshots)
      .where(and(eq(accountBalanceSnapshots.ownerId, ownerId), eq(accountBalanceSnapshots.accountId, accountId)))
      .orderBy(asc(accountBalanceSnapshots.snapshotDate));
  }

  async createMany(inputs: AccountBalanceSnapshotCreateInput[]): Promise<AccountBalanceSnapshot[]> {
    if (inputs.length === 0) return [];
    // ON CONFLICT DO NOTHING against account_balance_snapshots_account_
    // date_idx — Postgres's RETURNING clause on a DO NOTHING insert only
    // reports rows that were actually written, so a re-run capture for a
    // date that already has snapshots comes back empty rather than
    // throwing or silently pretending to have re-captured them.
    return this.db.insert(accountBalanceSnapshots).values(inputs).onConflictDoNothing().returning();
  }
}
