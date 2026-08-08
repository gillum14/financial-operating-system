import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { DbClient } from "@/db/client";
import { NotFoundError } from "@/domains/errors";

import { DrizzleMissionRepository } from "./missions-repository";
import { createTestAuthUser } from "./test-support/create-test-auth-user";
import { createTestDbClient, isDbTestingAllowed } from "./test-support/test-db-client";
import { withRollback } from "./test-support/with-rollback";

// See db-test-guard.ts — requires ALLOW_DB_TESTS=true and a separate
// TEST_DATABASE_URL, never DATABASE_URL. Skipped entirely (and no real
// connection opened) when the guard refuses.
const hasDatabase = isDbTestingAllowed();

describe.skipIf(!hasDatabase)("DrizzleMissionRepository (integration)", () => {
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

  it("does not return another owner's missions", async () => {
    await withRollback(db, async (tx) => {
      const repo = new DrizzleMissionRepository(tx);

      const ownerA = await createTestAuthUser(tx);
      const ownerB = await createTestAuthUser(tx);

      await repo.create({
        ownerId: ownerA.id,
        missionType: "reduce-debt",
        title: "A's mission",
        description: "desc",
        relatedGoalId: null,
        relatedAccountId: null,
        relatedBudgetPeriodId: null,
        relatedTransactionIds: null,
        startValue: "500.0000",
        targetValue: "0.0000",
        targetBandId: null,
      });
      await repo.create({
        ownerId: ownerB.id,
        missionType: "reduce-debt",
        title: "B's mission",
        description: "desc",
        relatedGoalId: null,
        relatedAccountId: null,
        relatedBudgetPeriodId: null,
        relatedTransactionIds: null,
        startValue: "500.0000",
        targetValue: "0.0000",
        targetBandId: null,
      });

      const ownerAMissions = await repo.listForOwner(ownerA.id);
      expect(ownerAMissions).toHaveLength(1);
      expect(ownerAMissions[0].title).toBe("A's mission");
    });
  });

  it("creates and reads back a mission by id for its owner", async () => {
    await withRollback(db, async (tx) => {
      const repo = new DrizzleMissionRepository(tx);
      const owner = await createTestAuthUser(tx);

      const created = await repo.create({
        ownerId: owner.id,
        missionType: "categorize-transactions",
        title: "Categorize Your Transactions",
        description: "desc",
        relatedGoalId: null,
        relatedAccountId: null,
        relatedBudgetPeriodId: null,
        relatedTransactionIds: ["t1", "t2"],
        startValue: "0.0000",
        targetValue: "2.0000",
        targetBandId: null,
      });

      expect(created.status).toBe("active");
      expect(created.startedAt).toBeInstanceOf(Date);
      expect(created.completedAt).toBeNull();

      const reloaded = await repo.getByIdForOwner(created.id, owner.id);
      expect(reloaded?.relatedTransactionIds).toEqual(["t1", "t2"]);
    });
  });

  it("getByIdForOwner returns null for another owner's mission, never the row itself", async () => {
    await withRollback(db, async (tx) => {
      const repo = new DrizzleMissionRepository(tx);
      const ownerA = await createTestAuthUser(tx);
      const ownerB = await createTestAuthUser(tx);

      const mission = await repo.create({
        ownerId: ownerA.id,
        missionType: "improve-confidence",
        title: "Reach the Strong band",
        description: "desc",
        relatedGoalId: null,
        relatedAccountId: null,
        relatedBudgetPeriodId: null,
        relatedTransactionIds: null,
        startValue: "70.0000",
        targetValue: "85.0000",
        targetBandId: "strong",
      });

      expect(await repo.getByIdForOwner(mission.id, ownerB.id)).toBeNull();
    });
  });

  it("updateStatus transitions active -> completed with a real completedAt, and is owner-scoped", async () => {
    await withRollback(db, async (tx) => {
      const repo = new DrizzleMissionRepository(tx);
      const ownerA = await createTestAuthUser(tx);
      const ownerB = await createTestAuthUser(tx);

      const mission = await repo.create({
        ownerId: ownerA.id,
        missionType: "reduce-debt",
        title: "Pay Off Card",
        description: "desc",
        relatedGoalId: null,
        relatedAccountId: null,
        relatedBudgetPeriodId: null,
        relatedTransactionIds: null,
        startValue: "500.0000",
        targetValue: "0.0000",
        targetBandId: null,
      });

      await expect(
        repo.updateStatus(mission.id, ownerB.id, { status: "completed", completedAt: new Date() }),
      ).rejects.toThrow(NotFoundError);

      const completed = await repo.updateStatus(mission.id, ownerA.id, { status: "completed", completedAt: new Date() });
      expect(completed.status).toBe("completed");
      expect(completed.completedAt).toBeInstanceOf(Date);
    });
  });
});
