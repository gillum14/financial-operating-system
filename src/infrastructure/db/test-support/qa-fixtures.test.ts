import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { DbClient } from "@/db/client";
import { accounts as accountsTable, categories as categoriesTable } from "@/db/schema";

import { createTestAuthUser } from "./create-test-auth-user";
import { createQaFixtureSet } from "./qa-fixtures";
import { createTestDbClient, isDbTestingAllowed } from "./test-db-client";
import { withRollback } from "./with-rollback";

// See db-test-guard.ts — requires ALLOW_DB_TESTS=true and a separate
// TEST_DATABASE_URL, never DATABASE_URL. Skipped entirely (and no real
// connection opened) when the guard refuses.
const hasDatabase = isDbTestingAllowed();

describe.skipIf(!hasDatabase)("QaFixtureSet (integration)", () => {
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

  // The literal regression test for the incident this helper exists to
  // prevent (see qa-fixtures.ts's header comment): a pre-existing row and a
  // freshly-tracked fixture row share the same owner. cleanup() must delete
  // only the tracked one.
  it("deletes only the tracked row, never an untracked row for the same owner", async () => {
    await withRollback(db, async (tx) => {
      const owner = await createTestAuthUser(tx);

      // Simulates a pre-existing category that a broad owner-scoped delete
      // would have wrongly swept up — inserted directly, never tracked.
      const [preExisting] = await tx
        .insert(categoriesTable)
        .values({ ownerId: owner.id, name: "Pre-existing Groceries" })
        .returning();

      const fixtures = createQaFixtureSet(tx);
      const tracked = await fixtures.createCategory({ ownerId: owner.id, name: "Verification Groceries" });

      expect(fixtures.trackedCount).toBe(1);

      const report = await fixtures.cleanup();

      expect(report.deleted).toEqual([{ table: "categories", id: tracked.id }]);
      expect(report.totalTracked).toBe(1);

      const [trackedRow] = await tx.select().from(categoriesTable).where(eq(categoriesTable.id, tracked.id));
      const [survivorRow] = await tx.select().from(categoriesTable).where(eq(categoriesTable.id, preExisting.id));

      expect(trackedRow).toBeUndefined();
      expect(survivorRow).toBeDefined();
      expect(survivorRow.name).toBe("Pre-existing Groceries");
    });
  });

  it("is FK-safe by construction: deletes a child category before its parent", async () => {
    await withRollback(db, async (tx) => {
      const owner = await createTestAuthUser(tx);
      const fixtures = createQaFixtureSet(tx);

      const parent = await fixtures.createCategory({ ownerId: owner.id, name: "Parent" });
      const child = await fixtures.createCategory({
        ownerId: owner.id,
        name: "Child",
        parentCategoryId: parent.id,
      });

      // parentCategoryId is ON DELETE RESTRICT — deleting the parent first
      // would throw. cleanup() must not do that.
      const report = await fixtures.cleanup();
      expect(report.totalTracked).toBe(2);
      expect(report.deleted.map((entry) => entry.id)).toEqual([child.id, parent.id]);

      const remaining = await tx
        .select()
        .from(categoriesTable)
        .where(eq(categoriesTable.ownerId, owner.id));
      expect(remaining).toHaveLength(0);
    });
  });

  it("is FK-safe across an account -> transaction chain", async () => {
    await withRollback(db, async (tx) => {
      const owner = await createTestAuthUser(tx);
      const fixtures = createQaFixtureSet(tx);

      const account = await fixtures.createAccount({ ownerId: owner.id, name: "Checking", accountType: "checking" });
      await fixtures.createTransaction({
        ownerId: owner.id,
        accountId: account.id,
        transactionDate: "2026-08-01",
        originalDescription: "Test transaction",
        amount: "10.00",
        transactionType: "expense",
      });

      // accounts.id is referenced by transactions.accountId ON DELETE
      // RESTRICT — deleting the account first would throw.
      await expect(fixtures.cleanup()).resolves.toMatchObject({ totalTracked: 2 });
    });
  });

  it("is FK-safe across a goal -> goal_contribution -> goal_allocation chain", async () => {
    await withRollback(db, async (tx) => {
      const owner = await createTestAuthUser(tx);
      const fixtures = createQaFixtureSet(tx);

      const account = await fixtures.createAccount({
        ownerId: owner.id,
        name: "Savings",
        accountType: "savings",
        currentBalance: "500.00",
      });
      const goal = await fixtures.createGoal({
        ownerId: owner.id,
        title: "Emergency Fund",
        targetAmount: "1000.00",
        goalType: "emergency-fund",
      });
      await fixtures.createGoalContribution({
        ownerId: owner.id,
        goalId: goal.id,
        amount: "50.00",
        contributionDate: "2026-08-01",
      });
      await fixtures.createGoalAllocation({
        ownerId: owner.id,
        goalId: goal.id,
        accountId: account.id,
        amount: "100.00",
      });

      await expect(fixtures.cleanup()).resolves.toMatchObject({ totalTracked: 4 });
    });
  });

  it("is FK-safe across a budget_period -> budget_allocation -> adjustment chain", async () => {
    await withRollback(db, async (tx) => {
      const owner = await createTestAuthUser(tx);
      const fixtures = createQaFixtureSet(tx);

      const category = await fixtures.createCategory({ ownerId: owner.id, name: "Groceries" });
      const period = await fixtures.createBudgetPeriod({
        ownerId: owner.id,
        periodStart: "2026-08-01",
        periodEnd: "2026-08-31",
      });
      const allocation = await fixtures.createBudgetAllocation({
        ownerId: owner.id,
        budgetPeriodId: period.id,
        categoryId: category.id,
        plannedAmount: "400.00",
      });
      await fixtures.createBudgetAllocationAdjustment({
        ownerId: owner.id,
        budgetAllocationId: allocation.id,
        previousAmount: "400.00",
        newAmount: "450.00",
      });

      await expect(fixtures.cleanup()).resolves.toMatchObject({ totalTracked: 4 });
    });
  });

  it("creates and cleans up snapshot rows (confidence and net worth)", async () => {
    await withRollback(db, async (tx) => {
      const owner = await createTestAuthUser(tx);
      const fixtures = createQaFixtureSet(tx);

      const account = await fixtures.createAccount({ ownerId: owner.id, name: "Checking", accountType: "checking" });
      await fixtures.createAccountBalanceSnapshot({
        ownerId: owner.id,
        accountId: account.id,
        snapshotDate: "2026-08-01",
        balance: "1000.00",
        accountType: "checking",
        balanceSource: "manual",
      });
      await fixtures.createConfidenceScoreSnapshot({
        ownerId: owner.id,
        snapshotDate: "2026-08-01",
        overallScore: 72,
        band: "stable",
        pillarScores: {},
      });

      await expect(fixtures.cleanup()).resolves.toMatchObject({ totalTracked: 3 });
    });
  });

  it("creates and cleans up a mission, FK-safe against the goal it's tied to", async () => {
    await withRollback(db, async (tx) => {
      const owner = await createTestAuthUser(tx);
      const fixtures = createQaFixtureSet(tx);

      const goal = await fixtures.createGoal({
        ownerId: owner.id,
        title: "Emergency Fund",
        targetAmount: "1000.00",
        goalType: "emergency-fund",
      });
      await fixtures.createMission({
        ownerId: owner.id,
        missionType: "fund-emergency-fund",
        title: "Fund \"Emergency Fund\"",
        description: "Build your emergency fund toward its target.",
        relatedGoalId: goal.id,
      });

      // goals.id is referenced by missions.related_goal_id (ON DELETE SET
      // NULL, not RESTRICT — but reverse-order deletion still means the
      // mission is gone before the goal it referenced is touched).
      await expect(fixtures.cleanup()).resolves.toMatchObject({ totalTracked: 2 });
    });
  });

  it("is idempotent: a second cleanup() call on an empty ledger is a safe no-op", async () => {
    await withRollback(db, async (tx) => {
      const owner = await createTestAuthUser(tx);
      const fixtures = createQaFixtureSet(tx);

      await fixtures.createCategory({ ownerId: owner.id, name: "One-off" });

      await fixtures.cleanup();
      const second = await fixtures.cleanup();

      expect(second).toEqual({ deleted: [], totalTracked: 0 });
    });
  });

  it("trackExisting() supports cleaning up a row this helper didn't create, but refuses a non-UUID id", async () => {
    await withRollback(db, async (tx) => {
      const owner = await createTestAuthUser(tx);

      // Simulates a row created outside this helper (e.g. via a real
      // server action during live QA) that still needs tracked cleanup.
      const [externallyCreated] = await tx
        .insert(accountsTable)
        .values({ ownerId: owner.id, name: "Externally created", accountType: "checking" })
        .returning();

      const fixtures = createQaFixtureSet(tx);
      fixtures.trackExisting("accounts", externallyCreated.id);

      expect(() => fixtures.trackExisting("accounts", "not-a-uuid")).toThrow(/non-UUID id/);
      expect(() => fixtures.trackExisting("accounts", "")).toThrow(/non-UUID id/);

      const report = await fixtures.cleanup();
      expect(report.deleted).toEqual([{ table: "accounts", id: externallyCreated.id }]);
    });
  });
});
