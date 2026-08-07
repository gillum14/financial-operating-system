import { randomUUID } from "node:crypto";

import { and, eq, inArray, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { DbClient } from "@/db/client";
import { accounts as accountsTable, goalAllocations, goals as goalsTable, users } from "@/db/schema";
import { ConflictError } from "@/domains/errors";

import { DrizzleGoalAllocationRepository } from "./goals-repository";
import { createTestAuthUser } from "./test-support/create-test-auth-user";
import { createTestDbClient, isDbTestingAllowed } from "./test-support/test-db-client";
import { withRollback } from "./test-support/with-rollback";

// See db-test-guard.ts — requires ALLOW_DB_TESTS=true and a separate
// TEST_DATABASE_URL, never DATABASE_URL. Skipped entirely (and no real
// connection opened) when the guard refuses.
const hasDatabase = isDbTestingAllowed();

describe.skipIf(!hasDatabase)("DrizzleGoalAllocationRepository (integration)", () => {
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

  // Exercises the goal_allocations_no_overallocation trigger directly
  // (via the repository, bypassing GoalService's own proactive check
  // entirely) — proves the database-level invariant holds on its own,
  // independent of whether application code remembered to check first.
  it("the database rejects an allocation that would exceed the account's balance, even when called directly", async () => {
    await withRollback(db, async (tx) => {
      const owner = await createTestAuthUser(tx);
      const [account] = await tx
        .insert(accountsTable)
        .values({ ownerId: owner.id, name: "Savings", accountType: "savings", currentBalance: "1000.00" })
        .returning();
      const [goalA] = await tx
        .insert(goalsTable)
        .values({ ownerId: owner.id, title: "Goal A", targetAmount: "1000.00", goalType: "general-savings" })
        .returning();
      const [goalB] = await tx
        .insert(goalsTable)
        .values({ ownerId: owner.id, title: "Goal B", targetAmount: "1000.00", goalType: "general-savings" })
        .returning();

      const allocationRepository = new DrizzleGoalAllocationRepository(tx);
      await allocationRepository.create({ ownerId: owner.id, goalId: goalA.id, accountId: account.id, amount: "700.00" });

      await expect(
        allocationRepository.create({ ownerId: owner.id, goalId: goalB.id, accountId: account.id, amount: "500.00" }),
      ).rejects.toBeInstanceOf(ConflictError);
    });
  });

  it("the database allows an allocation that exactly exhausts the remaining balance", async () => {
    await withRollback(db, async (tx) => {
      const owner = await createTestAuthUser(tx);
      const [account] = await tx
        .insert(accountsTable)
        .values({ ownerId: owner.id, name: "Savings", accountType: "savings", currentBalance: "1000.00" })
        .returning();
      const [goalA] = await tx
        .insert(goalsTable)
        .values({ ownerId: owner.id, title: "Goal A", targetAmount: "1000.00", goalType: "general-savings" })
        .returning();
      const [goalB] = await tx
        .insert(goalsTable)
        .values({ ownerId: owner.id, title: "Goal B", targetAmount: "1000.00", goalType: "general-savings" })
        .returning();

      const allocationRepository = new DrizzleGoalAllocationRepository(tx);
      await allocationRepository.create({ ownerId: owner.id, goalId: goalA.id, accountId: account.id, amount: "700.00" });
      const second = await allocationRepository.create({
        ownerId: owner.id,
        goalId: goalB.id,
        accountId: account.id,
        amount: "300.00",
      });

      expect(second.amount).toBe("300.0000");
    });
  });

  it("editing an allocation past the account's available balance is rejected", async () => {
    await withRollback(db, async (tx) => {
      const owner = await createTestAuthUser(tx);
      const [account] = await tx
        .insert(accountsTable)
        .values({ ownerId: owner.id, name: "Savings", accountType: "savings", currentBalance: "1000.00" })
        .returning();
      const [goal] = await tx
        .insert(goalsTable)
        .values({ ownerId: owner.id, title: "Goal A", targetAmount: "1000.00", goalType: "general-savings" })
        .returning();

      const allocationRepository = new DrizzleGoalAllocationRepository(tx);
      const allocation = await allocationRepository.create({
        ownerId: owner.id,
        goalId: goal.id,
        accountId: account.id,
        amount: "500.00",
      });

      await expect(
        allocationRepository.update(allocation.id, owner.id, { amount: "1500.00" }),
      ).rejects.toBeInstanceOf(ConflictError);
    });
  });

  // Two real, separately-connected transactions racing to allocate against
  // the same account — the scenario the trigger's SELECT ... FOR UPDATE
  // row lock exists for. Cannot use withRollback (it only ever holds one
  // transaction); this test opens two independent connections, deliberately
  // holds the first transaction open past its own write so the second
  // transaction's write genuinely blocks on the row lock, then releases
  // the first and observes the second re-evaluate against the now-
  // committed state. Cleans up manually afterward since nothing here
  // rolls back automatically.
  it(
    "concurrent allocation writes against the same account never both succeed past its balance",
    async () => {
      const client1 = createTestDbClient();
      const client2 = createTestDbClient();
      const ownerId = randomUUID();

      try {
        await createTestAuthUser(client1.db, { id: ownerId });
        const [account] = await client1.db
          .insert(accountsTable)
          .values({ ownerId, name: "Race Test Savings", accountType: "savings", currentBalance: "1000.00" })
          .returning();
        const [goalA] = await client1.db
          .insert(goalsTable)
          .values({ ownerId, title: "Race Goal A", targetAmount: "1000.00", goalType: "general-savings" })
          .returning();
        const [goalB] = await client1.db
          .insert(goalsTable)
          .values({ ownerId, title: "Race Goal B", targetAmount: "1000.00", goalType: "general-savings" })
          .returning();

        let tx1HasInserted: () => void;
        const tx1InsertedSignal = new Promise<void>((resolve) => {
          tx1HasInserted = resolve;
        });
        let releaseTx1: () => void;
        const tx1ReleaseGate = new Promise<void>((resolve) => {
          releaseTx1 = resolve;
        });

        // Tx1: insert 700 against the account, then hold the transaction
        // open (and, via the trigger, the row lock on `accounts`) until
        // explicitly released below.
        const tx1Promise = client1.db.transaction(async (tx) => {
          const repo = new DrizzleGoalAllocationRepository(tx);
          await repo.create({ ownerId, goalId: goalA.id, accountId: account.id, amount: "700.00" });
          tx1HasInserted();
          await tx1ReleaseGate;
        });

        await tx1InsertedSignal;

        // Tx2: attempt 500 against the same account — 700 + 500 = 1200 >
        // 1000, so this must fail once it can actually see Tx1's row. If
        // the trigger did NOT lock the account row, Tx2 could read a
        // stale "0 already allocated" and wrongly succeed.
        const tx2Promise = client2.db.transaction(async (tx) => {
          const repo = new DrizzleGoalAllocationRepository(tx);
          return repo.create({ ownerId, goalId: goalB.id, accountId: account.id, amount: "500.00" });
        });

        // Give Tx2 a moment to actually issue its statement and block on
        // Tx1's row lock before releasing Tx1.
        await new Promise((resolve) => setTimeout(resolve, 300));
        releaseTx1!();
        await tx1Promise;

        await expect(tx2Promise).rejects.toBeInstanceOf(ConflictError);

        // Exactly one allocation survives — the invariant held under real
        // concurrency, not just in the sequential/app-level case.
        const survivingAllocations = await client1.db
          .select()
          .from(goalAllocations)
          .where(and(eq(goalAllocations.ownerId, ownerId), inArray(goalAllocations.goalId, [goalA.id, goalB.id])));
        expect(survivingAllocations).toHaveLength(1);
        expect(survivingAllocations[0].amount).toBe("700.0000");
      } finally {
        // Manual cleanup in FK-safe order (allocations -> goals -> account
        // -> users), using the trusted connection, which is unrestricted
        // by the `authenticated`-role RLS grants (no DELETE grant applies
        // to it). Guarded in its own try/finally — a cleanup failure must
        // never skip closing the two extra connections this test opened;
        // leaking either would starve every DB-backed test file that runs
        // after this one (a real bug this test hit once already).
        try {
          await client1.db.delete(goalAllocations).where(eq(goalAllocations.ownerId, ownerId));
          await client1.db.delete(goalsTable).where(eq(goalsTable.ownerId, ownerId));
          await client1.db.delete(accountsTable).where(eq(accountsTable.ownerId, ownerId));
          await client1.db.delete(users).where(eq(users.id, ownerId));
          await client1.db.execute(sql`delete from auth.users where id = ${ownerId}`);
        } finally {
          await client1.close();
          await client2.close();
        }
      }
    },
    15000,
  );
});
