import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { DbClient } from "@/db/client";
import { ConflictError } from "@/domains/errors";
import { DrizzleMissionRepository } from "@/infrastructure/db/missions-repository";
import { createTestAuthUser } from "@/infrastructure/db/test-support/create-test-auth-user";
import { createTestDbClient, isDbTestingAllowed } from "@/infrastructure/db/test-support/test-db-client";
import { withRollback } from "@/infrastructure/db/test-support/with-rollback";

import { MissionService } from "./service";

// See db-test-guard.ts — requires ALLOW_DB_TESTS=true and a separate
// TEST_DATABASE_URL, never DATABASE_URL. Skipped entirely (and no real
// connection opened) when the guard refuses.
const hasDatabase = isDbTestingAllowed();

// createCustomMission/completeCustomMission touch only missionRepository —
// unlike every other MissionService method, they never read Goals/Budgets/
// Accounts/Transactions/Confidence — so the other five constructor
// dependencies are never called here and are deliberately left as
// never-invoked stand-ins rather than pulling in real GoalService/
// BudgetService wiring this test doesn't need.
function makeCustomMissionOnlyService(tx: DbClient): MissionService {
  const unused = () => {
    throw new Error("not expected to be called by a custom-mission-only test");
  };
  return new MissionService(
    new DrizzleMissionRepository(tx),
    { listGoalsWithProgress: unused } as never,
    { getActiveBudgetPeriod: unused, getBudgetPeriodSummary: unused } as never,
    { listForOwner: unused } as never,
    { listForOwner: unused } as never,
    unused,
  );
}

describe.skipIf(!hasDatabase)("MissionService custom missions (integration)", () => {
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

  it("createCustomMission persists directly as Active, with no related entity or start/target snapshot", async () => {
    await withRollback(db, async (tx) => {
      const service = makeCustomMissionOnlyService(tx);
      const owner = await createTestAuthUser(tx);

      const mission = await service.createCustomMission({
        ownerId: owner.id,
        title: "Cancel unused subscriptions",
        description: "Review recurring charges and cancel what I don't use.",
      });

      expect(mission.missionType).toBe("custom");
      expect(mission.status).toBe("active");
      expect(mission.relatedGoalId).toBeNull();
      expect(mission.relatedAccountId).toBeNull();
      expect(mission.relatedBudgetPeriodId).toBeNull();
      expect(mission.startValue).toBeNull();
      expect(mission.targetValue).toBeNull();
      expect(mission.completedAt).toBeNull();
    });
  });

  it("completeCustomMission transitions active -> completed with a real completedAt, and is owner-scoped", async () => {
    await withRollback(db, async (tx) => {
      const service = makeCustomMissionOnlyService(tx);
      const ownerA = await createTestAuthUser(tx);
      const ownerB = await createTestAuthUser(tx);

      const mission = await service.createCustomMission({
        ownerId: ownerA.id,
        title: "Read the term life policy",
        description: "Confirm coverage amount and beneficiaries.",
      });

      await expect(service.completeCustomMission(mission.id, ownerB.id)).rejects.toThrow();

      const completed = await service.completeCustomMission(mission.id, ownerA.id);
      expect(completed.status).toBe("completed");
      expect(completed.completedAt).toBeInstanceOf(Date);
    });
  });

  it("completeCustomMission refuses to complete a non-custom mission, even for its real owner", async () => {
    await withRollback(db, async (tx) => {
      const service = makeCustomMissionOnlyService(tx);
      const owner = await createTestAuthUser(tx);
      const missionRepository = new DrizzleMissionRepository(tx);

      // A system-type mission created directly via the repository (bypassing
      // startMission's eligibility check, which isn't the point here) —
      // simulates "some real, non-custom active mission exists."
      const systemMission = await missionRepository.create({
        ownerId: owner.id,
        missionType: "reduce-debt",
        title: "Pay Off Test Card",
        description: "desc",
        relatedGoalId: null,
        relatedAccountId: null,
        relatedBudgetPeriodId: null,
        relatedTransactionIds: null,
        startValue: "500.0000",
        targetValue: "0.0000",
        targetBandId: null,
      });

      await expect(service.completeCustomMission(systemMission.id, owner.id)).rejects.toThrow(ConflictError);
    });
  });

  it("completeCustomMission refuses to complete an already-completed or archived custom mission", async () => {
    await withRollback(db, async (tx) => {
      const service = makeCustomMissionOnlyService(tx);
      const owner = await createTestAuthUser(tx);

      const mission = await service.createCustomMission({ ownerId: owner.id, title: "t", description: "d" });
      await service.completeCustomMission(mission.id, owner.id);

      await expect(service.completeCustomMission(mission.id, owner.id)).rejects.toThrow(ConflictError);
    });
  });
});
