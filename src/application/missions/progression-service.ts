import type {
  MissionProgressionRepository,
  MissionRewardRepository,
  MissionXpEventRepository,
} from "@/domains/mission-progression/repository";
import type { MissionProgression, MissionRewardKey } from "@/domains/mission-progression/types";
import type { Mission } from "@/domains/missions/types";

import { DAILY_MISSION_BONUS_XP, computeLevel, computeNewlyEligibleRewards, computeStreakUpdate } from "./progression-calculations";

export interface UnlockedMissionReward {
  key: MissionRewardKey;
  unlockedAt: Date;
}

export interface MissionProgressionOverview {
  totalXp: number;
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  currentStreak: number;
  longestStreak: number;
  completedMissionCount: number;
  unlockedRewards: UnlockedMissionReward[];
}

// The only class that touches mission_progression/mission_xp_events/
// mission_rewards. Deliberately has no dependency on GoalService,
// BudgetService, AccountRepository, TransactionRepository, or a
// Confidence score getter — everything it needs (xpValue, difficulty,
// isDailyMission, completedAt) already lives on the Mission row it's
// given. This is what keeps XP/progression structurally separate from
// Confidence: there is no code path here that could read or influence a
// Confidence Score.
export class MissionProgressionService {
  constructor(
    private readonly progressionRepository: MissionProgressionRepository,
    private readonly xpEventRepository: MissionXpEventRepository,
    private readonly rewardRepository: MissionRewardRepository,
  ) {}

  async getOverview(ownerId: string): Promise<MissionProgressionOverview> {
    const [progression, unlockedRewards] = await Promise.all([
      this.getOrCreateProgression(ownerId),
      this.rewardRepository.listForOwner(ownerId),
    ]);

    return this.toOverview(
      progression,
      unlockedRewards.map((reward) => ({ key: reward.rewardKey, unlockedAt: reward.unlockedAt })),
    );
  }

  // Called exactly once per mission, immediately after MissionService
  // transitions that mission from Active to Completed for the first time
  // — either the deterministic auto-evaluation path or
  // completeCustomMission, never a second time for the same mission
  // (both callers only ever reach this once, since a mission's status can
  // never revert to Active). The xpEventRepository.createIfNotExists
  // unique-index check is the backstop in case this is ever called twice
  // anyway (e.g. a retried request) — a second call is always a safe
  // no-op, never a double-award.
  async recordMissionCompletion(mission: Mission): Promise<void> {
    const baseXp = mission.xpValue;
    const bonusXp = mission.isDailyMission ? DAILY_MISSION_BONUS_XP : 0;

    const event = await this.xpEventRepository.createIfNotExists({
      ownerId: mission.ownerId,
      missionId: mission.id,
      baseXp,
      bonusXp,
    });
    if (!event) {
      // XP for this mission was already recorded — nothing further to do.
      return;
    }

    const progression = await this.getOrCreateProgression(mission.ownerId);
    const completionDate = (mission.completedAt ?? new Date()).toISOString().slice(0, 10);
    const streakUpdate = computeStreakUpdate(
      {
        currentStreak: progression.currentStreak,
        longestStreak: progression.longestStreak,
        lastQualifyingCompletionDate: progression.lastQualifyingCompletionDate,
      },
      completionDate,
    );

    const updated = await this.progressionRepository.updateStats(mission.ownerId, {
      totalXp: progression.totalXp + baseXp + bonusXp,
      completedMissionCount: progression.completedMissionCount + 1,
      currentStreak: streakUpdate.currentStreak,
      longestStreak: streakUpdate.longestStreak,
      lastQualifyingCompletionDate: streakUpdate.lastQualifyingCompletionDate,
    });

    // Whether THIS completion was itself a Major Milestone mission is
    // sufficient to evaluate "major-win" correctly — if an earlier
    // completion had already made it eligible, it would already be
    // unlocked (this same check runs after every completion), so there's
    // no need to look back across the owner's full mission history here.
    await this.unlockEligibleRewards(mission.ownerId, updated, mission.difficulty === "major-milestone");
  }

  private async unlockEligibleRewards(
    ownerId: string,
    progression: MissionProgression,
    justCompletedMajorMilestone: boolean,
  ): Promise<void> {
    const unlockedRewards = await this.rewardRepository.listForOwner(ownerId);
    const alreadyUnlockedKeys = new Set(unlockedRewards.map((reward) => reward.rewardKey));

    const newlyEligible = computeNewlyEligibleRewards(
      {
        completedMissionCount: progression.completedMissionCount,
        currentStreak: progression.currentStreak,
        level: computeLevel(progression.totalXp).level,
        hasCompletedMajorMilestone: justCompletedMajorMilestone,
      },
      alreadyUnlockedKeys,
    );

    for (const reward of newlyEligible) {
      await this.rewardRepository.createIfNotExists({ ownerId, rewardKey: reward.key });
    }
  }

  private toOverview(progression: MissionProgression, unlockedRewards: UnlockedMissionReward[]): MissionProgressionOverview {
    const levelProgress = computeLevel(progression.totalXp);
    return {
      totalXp: progression.totalXp,
      level: levelProgress.level,
      xpIntoLevel: levelProgress.xpIntoLevel,
      xpForNextLevel: levelProgress.xpForNextLevel,
      currentStreak: progression.currentStreak,
      longestStreak: progression.longestStreak,
      completedMissionCount: progression.completedMissionCount,
      unlockedRewards,
    };
  }

  // Lazily creates the one-per-owner row on first real use (first mission
  // ever completed, or first overview read) rather than needing a
  // separate provisioning step anywhere in the signup flow —
  // getOrCreateForOwner itself is the transaction-safe, ON CONFLICT DO
  // NOTHING implementation (see DrizzleMissionProgressionRepository).
  private async getOrCreateProgression(ownerId: string) {
    return this.progressionRepository.getOrCreateForOwner(ownerId, {
      ownerId,
      totalXp: 0,
      currentStreak: 0,
      longestStreak: 0,
      completedMissionCount: 0,
      lastQualifyingCompletionDate: null,
    });
  }
}
