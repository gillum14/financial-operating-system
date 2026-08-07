import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { DbClient } from "@/db/client";
import { accounts as accountsTable, accountBalanceSnapshots } from "@/db/schema";

import { DrizzleAccountBalanceSnapshotRepository } from "./net-worth-history-repository";
import { createTestAuthUser } from "./test-support/create-test-auth-user";
import { createTestDbClient, isDbTestingAllowed } from "./test-support/test-db-client";
import { withRollback } from "./test-support/with-rollback";

// See db-test-guard.ts — requires ALLOW_DB_TESTS=true and a separate
// TEST_DATABASE_URL, never DATABASE_URL. Skipped entirely (and no real
// connection opened) when the guard refuses.
const hasDatabase = isDbTestingAllowed();

describe.skipIf(!hasDatabase)("DrizzleAccountBalanceSnapshotRepository (integration)", () => {
  let db: DbClient;
  let close: () => Promise<void>;

  beforeAll(() => {
    const client = createTestDbClient();
    db = client.db;
    close = client.close;
  });

  afterAll(async () => {
    await close();
  });

  // Exercises the account_balance_snapshots_account_date_idx unique index
  // directly via the repository, bypassing SnapshotCaptureService — proves
  // the database-level idempotency invariant holds on its own, not just
  // because the service happens to call it carefully.
  it("createMany silently skips a row that already exists for (accountId, snapshotDate)", async () => {
    await withRollback(db, async (tx) => {
      const owner = await createTestAuthUser(tx);
      const [account] = await tx
        .insert(accountsTable)
        .values({ ownerId: owner.id, name: "Checking", accountType: "checking", currentBalance: "1000.00" })
        .returning();

      const repository = new DrizzleAccountBalanceSnapshotRepository(tx);

      const first = await repository.createMany([
        {
          ownerId: owner.id,
          accountId: account.id,
          snapshotDate: "2026-01-31",
          balance: "1000.00",
          accountType: "checking",
          balanceSource: "manual",
          snapshotType: "monthly",
        },
      ]);
      expect(first).toHaveLength(1);

      // A second capture for the same (account, date) — even with a
      // different balance — must insert nothing and never overwrite the
      // first row. This is what makes re-running a scheduled/manual
      // capture for a date that was already captured safe.
      const second = await repository.createMany([
        {
          ownerId: owner.id,
          accountId: account.id,
          snapshotDate: "2026-01-31",
          balance: "9999.00",
          accountType: "checking",
          balanceSource: "manual",
          snapshotType: "monthly",
        },
      ]);
      expect(second).toHaveLength(0);

      const stored = await tx
        .select()
        .from(accountBalanceSnapshots)
        .where(and(eq(accountBalanceSnapshots.ownerId, owner.id), eq(accountBalanceSnapshots.accountId, account.id)));
      expect(stored).toHaveLength(1);
      expect(stored[0].balance).toBe("1000.0000");
    });
  });

  it("listForOwner returns every snapshot across all accounts, oldest first", async () => {
    await withRollback(db, async (tx) => {
      const owner = await createTestAuthUser(tx);
      const [accountA] = await tx
        .insert(accountsTable)
        .values({ ownerId: owner.id, name: "Checking", accountType: "checking", currentBalance: "1000.00" })
        .returning();
      const [accountB] = await tx
        .insert(accountsTable)
        .values({ ownerId: owner.id, name: "Savings", accountType: "savings", currentBalance: "2000.00" })
        .returning();

      const repository = new DrizzleAccountBalanceSnapshotRepository(tx);
      await repository.createMany([
        {
          ownerId: owner.id,
          accountId: accountA.id,
          snapshotDate: "2026-02-28",
          balance: "1100.00",
          accountType: "checking",
          balanceSource: "manual",
          snapshotType: "monthly",
        },
        {
          ownerId: owner.id,
          accountId: accountB.id,
          snapshotDate: "2026-01-31",
          balance: "2000.00",
          accountType: "savings",
          balanceSource: "manual",
          snapshotType: "monthly",
        },
      ]);

      const history = await repository.listForOwner(owner.id);
      expect(history.map((row) => row.snapshotDate)).toEqual(["2026-01-31", "2026-02-28"]);
    });
  });

  it("listForOwnerAndAccount scopes to a single account's own history", async () => {
    await withRollback(db, async (tx) => {
      const owner = await createTestAuthUser(tx);
      const [accountA] = await tx
        .insert(accountsTable)
        .values({ ownerId: owner.id, name: "Checking", accountType: "checking", currentBalance: "1000.00" })
        .returning();
      const [accountB] = await tx
        .insert(accountsTable)
        .values({ ownerId: owner.id, name: "Savings", accountType: "savings", currentBalance: "2000.00" })
        .returning();

      const repository = new DrizzleAccountBalanceSnapshotRepository(tx);
      await repository.createMany([
        {
          ownerId: owner.id,
          accountId: accountA.id,
          snapshotDate: "2026-01-31",
          balance: "1000.00",
          accountType: "checking",
          balanceSource: "manual",
          snapshotType: "monthly",
        },
        {
          ownerId: owner.id,
          accountId: accountB.id,
          snapshotDate: "2026-01-31",
          balance: "2000.00",
          accountType: "savings",
          balanceSource: "manual",
          snapshotType: "monthly",
        },
      ]);

      const history = await repository.listForOwnerAndAccount(owner.id, accountA.id);
      expect(history).toHaveLength(1);
      expect(history[0].accountId).toBe(accountA.id);
    });
  });
});
