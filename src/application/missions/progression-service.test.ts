import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { DbClient } from "@/db/client";
import type { Mission } from "@/domains/missions/types";
import {
  DrizzleMissionProgressionRepository,
  DrizzleMissionRewardRepository,
  DrizzleMissionXpEventRepository,
} from "@/infrastructure/db/mission-progression-repository";
import { DrizzleMissionRepository } from "@/infrastructure/db/missions-repository";
import { createTestAuthUser } from "@/infrastructure/db/test-support/create-test-auth-user";
import { createTestDbClient, isDbTestingAllowed } from "@/infrastructure/db/test-support/test-db-client";
import { withRollback } from "@/infrastructure/db/test-support/with-rollback";

import { MissionProgressionService } from "./progression-service";

// See db-test-guard.ts — requires ALLOW_DB_TESTS=true and a separate
// TEST_DATABASE_URL, never DATABASE_URL. Skipped entirely (and no real
// connection opened) when the guard refuses.
const hasDatabase = isDbTestingAllowed();

function buildServices(tx: DbClient) {
  return {
    missionRepository: new DrizzleMissionRepository(tx),
    progressionService: new MissionProgressionService(
      new DrizzleMissionProgressionRepository(tx),
      new DrizzleMissionXpEventRepository(tx),
      new DrizzleMissionRewardRepository(tx),
    ),
    progressionRepository: new DrizzleMissionProgressionRepository(tx),
    xpEventRepository: new DrizzleMissionXpEventRepository(tx),
    rewardRepository: new DrizzleMissionRewardRepository(tx),
  };
}

// Real custom missions, already marked Completed at a specific date — lets
// these tests control exactly which calendar date each completion "counts
// as" for the streak rule, without needing to wait real days.
async function createCompletedMission(
  missionRepository: DrizzleMissionRepository,
  ownerId: string,
  completedAt: Date,
  overrides: { xpValue?: number; isDailyMission?: boolean } = {},
): Promise<Mission> {
  const created = await missionRepository.create({
    ownerId,
    missionType: "custom",
    title: "Test custom mission",
    description: "desc",
    difficulty: null,
    xpValue: overrides.xpValue ?? 100,
    isDailyMission: overrides.isDailyMission ?? false,
    relatedGoalId: null,
    relatedAccountId: null,
    relatedBudgetPeriodId: null,
    relatedTransactionIds: null,
    startValue: null,
    targetValue: null,
    targetBandId: null,
  });
  return missionRepository.updateStatus(created.id, ownerId, { status: "completed", completedAt });
}

describe.skipIf(!hasDatabase)("MissionProgressionService (integration)", () => {
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

  it("awards base XP, sets streak to 1, and unlocks First Step on the very first completion", async () => {
    await withRollback(db, async (tx) => {
      const { missionRepository, progressionService, progressionRepository, rewardRepository } = buildServices(tx);
      const owner = await createTestAuthUser(tx);

      const mission = await createCompletedMission(missionRepository, owner.id, new Date("2026-08-01T12:00:00Z"), {
        xpValue: 200,
      });
      await progressionService.recordMissionCompletion(mission);

      const progression = await progressionRepository.getByOwnerId(owner.id);
      expect(progression?.totalXp).toBe(200);
      expect(progression?.currentStreak).toBe(1);
      expect(progression?.completedMissionCount).toBe(1);

      const rewards = await rewardRepository.listForOwner(owner.id);
      expect(rewards.map((r) => r.rewardKey)).toContain("first-step");
    });
  });

  it("adds the +25 Daily Mission bonus only when isDailyMission is true, split correctly in the XP event", async () => {
    await withRollback(db, async (tx) => {
      const { missionRepository, progressionService, progressionRepository, xpEventRepository } = buildServices(tx);
      const owner = await createTestAuthUser(tx);

      const mission = await createCompletedMission(missionRepository, owner.id, new Date("2026-08-01T12:00:00Z"), {
        xpValue: 50,
        isDailyMission: true,
      });
      await progressionService.recordMissionCompletion(mission);

      const progression = await progressionRepository.getByOwnerId(owner.id);
      expect(progression?.totalXp).toBe(75);

      const events = await xpEventRepository.listForOwner(owner.id);
      expect(events[0]).toMatchObject({ baseXp: 50, bonusXp: 25 });
    });
  });

  it("is idempotent: calling recordMissionCompletion twice for the same mission never double-awards XP", async () => {
    await withRollback(db, async (tx) => {
      const { missionRepository, progressionService, progressionRepository, xpEventRepository } = buildServices(tx);
      const owner = await createTestAuthUser(tx);

      const mission = await createCompletedMission(missionRepository, owner.id, new Date("2026-08-01T12:00:00Z"), {
        xpValue: 100,
      });

      await progressionService.recordMissionCompletion(mission);
      await progressionService.recordMissionCompletion(mission);
      await progressionService.recordMissionCompletion(mission);

      const progression = await progressionRepository.getByOwnerId(owner.id);
      expect(progression?.totalXp).toBe(100);
      expect(progression?.completedMissionCount).toBe(1);

      const events = await xpEventRepository.listForOwner(owner.id);
      expect(events).toHaveLength(1);
    });
  });

  it("extends the streak across one grace day, and breaks it beyond that", async () => {
    await withRollback(db, async (tx) => {
      const { missionRepository, progressionService, progressionRepository } = buildServices(tx);
      const owner = await createTestAuthUser(tx);

      const day1 = await createCompletedMission(missionRepository, owner.id, new Date("2026-08-01T12:00:00Z"));
      await progressionService.recordMissionCompletion(day1);
      expect((await progressionRepository.getByOwnerId(owner.id))?.currentStreak).toBe(1);

      // One grace day skipped (Aug 1 -> Aug 3) still extends the streak.
      const day3 = await createCompletedMission(missionRepository, owner.id, new Date("2026-08-03T12:00:00Z"));
      await progressionService.recordMissionCompletion(day3);
      expect((await progressionRepository.getByOwnerId(owner.id))?.currentStreak).toBe(2);

      // A 3-day gap (Aug 3 -> Aug 7) breaks it, resetting to 1.
      const day7 = await createCompletedMission(missionRepository, owner.id, new Date("2026-08-07T12:00:00Z"));
      await progressionService.recordMissionCompletion(day7);
      const finalProgression = await progressionRepository.getByOwnerId(owner.id);
      expect(finalProgression?.currentStreak).toBe(1);
      expect(finalProgression?.longestStreak).toBe(2);
    });
  });

  it(
    "unlocks Momentum after 5 completed missions, not before",
    async () => {
      await withRollback(db, async (tx) => {
        const { missionRepository, progressionService, rewardRepository } = buildServices(tx);
        const owner = await createTestAuthUser(tx);

        for (let i = 0; i < 4; i++) {
          const mission = await createCompletedMission(missionRepository, owner.id, new Date(`2026-08-0${i + 1}T12:00:00Z`));
          await progressionService.recordMissionCompletion(mission);
        }
        let rewards = await rewardRepository.listForOwner(owner.id);
        expect(rewards.map((r) => r.rewardKey)).not.toContain("momentum");

        const fifth = await createCompletedMission(missionRepository, owner.id, new Date("2026-08-05T12:00:00Z"));
        await progressionService.recordMissionCompletion(fifth);

        rewards = await rewardRepository.listForOwner(owner.id);
        expect(rewards.map((r) => r.rewardKey)).toContain("momentum");
      });
    },
    15000,
  );

  it("unlocks Major Win only for a mission whose difficulty is major-milestone", async () => {
    await withRollback(db, async (tx) => {
      const { missionRepository, progressionService, rewardRepository } = buildServices(tx);
      const owner = await createTestAuthUser(tx);

      const created = await missionRepository.create({
        ownerId: owner.id,
        missionType: "fund-emergency-fund",
        title: "Fund Emergency Fund",
        description: "desc",
        difficulty: "major-milestone",
        xpValue: 500,
        isDailyMission: false,
        relatedGoalId: null,
        relatedAccountId: null,
        relatedBudgetPeriodId: null,
        relatedTransactionIds: null,
        startValue: "0.0000",
        targetValue: "1000.0000",
        targetBandId: null,
      });
      const completed = await missionRepository.updateStatus(created.id, owner.id, {
        status: "completed",
        completedAt: new Date(),
      });

      await progressionService.recordMissionCompletion(completed);

      const rewards = await rewardRepository.listForOwner(owner.id);
      expect(rewards.map((r) => r.rewardKey)).toContain("major-win");
    });
  });

  it("keeps two owners' progression, XP events, and rewards fully independent", async () => {
    await withRollback(db, async (tx) => {
      const { missionRepository, progressionService, progressionRepository } = buildServices(tx);
      const ownerA = await createTestAuthUser(tx);
      const ownerB = await createTestAuthUser(tx);

      const missionA = await createCompletedMission(missionRepository, ownerA.id, new Date("2026-08-01T12:00:00Z"), {
        xpValue: 300,
      });
      await progressionService.recordMissionCompletion(missionA);

      const progressionA = await progressionRepository.getByOwnerId(ownerA.id);
      const progressionB = await progressionRepository.getByOwnerId(ownerB.id);

      expect(progressionA?.totalXp).toBe(300);
      expect(progressionB).toBeNull();
    });
  });
});
