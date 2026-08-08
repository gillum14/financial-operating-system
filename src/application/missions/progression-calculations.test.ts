import { describe, expect, it } from "vitest";

import {
  CUSTOM_MISSION_XP,
  MISSION_TYPE_DIFFICULTY,
  REWARD_DEFINITIONS,
  XP_BY_DIFFICULTY,
  computeLevel,
  computeMissionXpValue,
  computeNewlyEligibleRewards,
  computeRewardProgress,
  computeStreakUpdate,
  type MissionRewardEligibilityStats,
} from "./progression-calculations";

describe("computeMissionXpValue", () => {
  it("returns the fixed difficulty and XP for each of the six real mission types", () => {
    expect(computeMissionXpValue("categorize-transactions")).toEqual({ difficulty: "easy", xpValue: 50 });
    expect(computeMissionXpValue("stay-within-budget")).toEqual({ difficulty: "medium", xpValue: 100 });
    expect(computeMissionXpValue("reach-savings-goal")).toEqual({ difficulty: "medium", xpValue: 100 });
    expect(computeMissionXpValue("reduce-debt")).toEqual({ difficulty: "hard", xpValue: 200 });
    expect(computeMissionXpValue("improve-confidence")).toEqual({ difficulty: "hard", xpValue: 200 });
    expect(computeMissionXpValue("fund-emergency-fund")).toEqual({ difficulty: "major-milestone", xpValue: 500 });
  });

  it("caps custom missions at a flat 100 XP with no difficulty", () => {
    expect(computeMissionXpValue("custom")).toEqual({ difficulty: null, xpValue: CUSTOM_MISSION_XP });
    expect(CUSTOM_MISSION_XP).toBe(100);
  });

  it("every difficulty tier matches the specified XP values exactly", () => {
    expect(XP_BY_DIFFICULTY.easy).toBe(50);
    expect(XP_BY_DIFFICULTY.medium).toBe(100);
    expect(XP_BY_DIFFICULTY.hard).toBe(200);
    expect(XP_BY_DIFFICULTY["major-milestone"]).toBe(500);
  });

  it("MISSION_TYPE_DIFFICULTY covers all six non-custom mission types", () => {
    expect(Object.keys(MISSION_TYPE_DIFFICULTY)).toHaveLength(6);
  });
});

describe("computeLevel", () => {
  it("starts at Level 1 with 0 XP", () => {
    expect(computeLevel(0)).toEqual({ level: 1, xpIntoLevel: 0, xpForNextLevel: 1000 });
  });

  it("reaches Level 2 at exactly 1,000 XP", () => {
    expect(computeLevel(1000).level).toBe(2);
    expect(computeLevel(999).level).toBe(1);
  });

  it("tracks partial progress into the current level", () => {
    expect(computeLevel(450)).toEqual({ level: 1, xpIntoLevel: 450, xpForNextLevel: 1000 });
    expect(computeLevel(1450)).toEqual({ level: 2, xpIntoLevel: 450, xpForNextLevel: 1000 });
  });

  it("reaches Level 5 at 4,000 XP and Level 10 at 9,000 XP (the Level Up / Financial Builder thresholds)", () => {
    expect(computeLevel(4000).level).toBe(5);
    expect(computeLevel(9000).level).toBe(10);
  });

  it("never goes negative for a negative or zero input", () => {
    expect(computeLevel(-500)).toEqual({ level: 1, xpIntoLevel: 0, xpForNextLevel: 1000 });
  });
});

describe("computeStreakUpdate", () => {
  const empty = { currentStreak: 0, longestStreak: 0, lastQualifyingCompletionDate: null };

  it("starts a new streak at 1 on the first-ever completion", () => {
    expect(computeStreakUpdate(empty, "2026-08-01")).toEqual({
      currentStreak: 1,
      longestStreak: 1,
      lastQualifyingCompletionDate: "2026-08-01",
    });
  });

  it("does not double-count a second completion on the same calendar day", () => {
    const state = { currentStreak: 3, longestStreak: 3, lastQualifyingCompletionDate: "2026-08-05" };
    expect(computeStreakUpdate(state, "2026-08-05")).toEqual(state);
  });

  it("extends the streak on the very next consecutive day", () => {
    const state = { currentStreak: 3, longestStreak: 5, lastQualifyingCompletionDate: "2026-08-05" };
    expect(computeStreakUpdate(state, "2026-08-06")).toEqual({
      currentStreak: 4,
      longestStreak: 5,
      lastQualifyingCompletionDate: "2026-08-06",
    });
  });

  it("still extends the streak across exactly one grace day (a gap of 2 days)", () => {
    const state = { currentStreak: 3, longestStreak: 3, lastQualifyingCompletionDate: "2026-08-05" };
    expect(computeStreakUpdate(state, "2026-08-07")).toEqual({
      currentStreak: 4,
      longestStreak: 4,
      lastQualifyingCompletionDate: "2026-08-07",
    });
  });

  it("breaks and restarts the streak at 1 once the gap exceeds the one grace day (3+ days)", () => {
    const state = { currentStreak: 10, longestStreak: 10, lastQualifyingCompletionDate: "2026-08-05" };
    expect(computeStreakUpdate(state, "2026-08-09")).toEqual({
      currentStreak: 1,
      longestStreak: 10,
      lastQualifyingCompletionDate: "2026-08-09",
    });
  });

  it("tracks longestStreak as the running maximum, never decreasing after a reset", () => {
    const afterLongRun = { currentStreak: 20, longestStreak: 20, lastQualifyingCompletionDate: "2026-08-05" };
    const afterReset = computeStreakUpdate(afterLongRun, "2026-09-01");
    expect(afterReset.currentStreak).toBe(1);
    expect(afterReset.longestStreak).toBe(20);
  });
});

describe("computeNewlyEligibleRewards", () => {
  const noneUnlocked = new Set<never>();

  it("REWARD_DEFINITIONS contains exactly the 8 specified rewards", () => {
    expect(REWARD_DEFINITIONS.map((r) => r.key)).toEqual([
      "first-step",
      "momentum",
      "building-habits",
      "on-a-roll",
      "consistency",
      "level-up",
      "financial-builder",
      "major-win",
    ]);
  });

  function stats(overrides: Partial<MissionRewardEligibilityStats> = {}): MissionRewardEligibilityStats {
    return { completedMissionCount: 0, currentStreak: 0, level: 1, hasCompletedMajorMilestone: false, ...overrides };
  }

  it("unlocks First Step at 1 completed mission, and not before", () => {
    expect(computeNewlyEligibleRewards(stats({ completedMissionCount: 0 }), noneUnlocked).map((r) => r.key)).not.toContain(
      "first-step",
    );
    expect(computeNewlyEligibleRewards(stats({ completedMissionCount: 1 }), noneUnlocked).map((r) => r.key)).toContain(
      "first-step",
    );
  });

  it("unlocks Momentum at 5 and Building Habits at 10 completed missions", () => {
    const keys = computeNewlyEligibleRewards(stats({ completedMissionCount: 10 }), noneUnlocked).map((r) => r.key);
    expect(keys).toEqual(expect.arrayContaining(["first-step", "momentum", "building-habits"]));
  });

  it("unlocks On a Roll at a 7-day streak and Consistency at 30", () => {
    expect(computeNewlyEligibleRewards(stats({ currentStreak: 7 }), noneUnlocked).map((r) => r.key)).toContain("on-a-roll");
    expect(computeNewlyEligibleRewards(stats({ currentStreak: 30 }), noneUnlocked).map((r) => r.key)).toEqual(
      expect.arrayContaining(["on-a-roll", "consistency"]),
    );
  });

  it("unlocks Level Up at Level 5 and Financial Builder at Level 10", () => {
    expect(computeNewlyEligibleRewards(stats({ level: 5 }), noneUnlocked).map((r) => r.key)).toContain("level-up");
    expect(computeNewlyEligibleRewards(stats({ level: 10 }), noneUnlocked).map((r) => r.key)).toEqual(
      expect.arrayContaining(["level-up", "financial-builder"]),
    );
  });

  it("unlocks Major Win only when a Major Milestone mission was completed", () => {
    expect(computeNewlyEligibleRewards(stats({ hasCompletedMajorMilestone: false }), noneUnlocked).map((r) => r.key)).not.toContain(
      "major-win",
    );
    expect(computeNewlyEligibleRewards(stats({ hasCompletedMajorMilestone: true }), noneUnlocked).map((r) => r.key)).toContain(
      "major-win",
    );
  });

  it("never re-returns a reward that's already in the unlocked set, even if still eligible", () => {
    const alreadyUnlocked = new Set<"first-step">(["first-step"]);
    const keys = computeNewlyEligibleRewards(stats({ completedMissionCount: 1 }), alreadyUnlocked).map((r) => r.key);
    expect(keys).not.toContain("first-step");
  });

  function definitionFor(key: string) {
    const definition = REWARD_DEFINITIONS.find((r) => r.key === key);
    if (!definition) throw new Error(`no reward definition for ${key}`);
    return definition;
  }

  describe("computeRewardProgress", () => {
    it("reports partial progress toward a missions-count reward, in its own units", () => {
      const progress = computeRewardProgress(definitionFor("momentum"), stats({ completedMissionCount: 3 }));
      expect(progress).toEqual({ current: 3, target: 5, percent: 60, label: "3 of 5 missions completed", isComplete: false });
    });

    it("reports partial progress toward a streak reward, in its own units", () => {
      const progress = computeRewardProgress(definitionFor("on-a-roll"), stats({ currentStreak: 2 }));
      expect(progress.label).toBe("2-day streak (goal: 7 days)");
      expect(progress.percent).toBe(Math.round((2 / 7) * 100));
      expect(progress.isComplete).toBe(false);
    });

    it("reports partial progress toward a level reward, in its own units", () => {
      const progress = computeRewardProgress(definitionFor("level-up"), stats({ level: 3 }));
      expect(progress).toEqual({ current: 3, target: 5, percent: 60, label: "Level 3 of 5", isComplete: false });
    });

    it("reports the binary Major Win milestone as done/not-done, never a fractional percent", () => {
      const notYet = computeRewardProgress(definitionFor("major-win"), stats({ hasCompletedMajorMilestone: false }));
      expect(notYet).toEqual({ current: 0, target: 1, percent: 0, label: "Not yet completed", isComplete: false });

      const done = computeRewardProgress(definitionFor("major-win"), stats({ hasCompletedMajorMilestone: true }));
      expect(done).toEqual({ current: 1, target: 1, percent: 100, label: "Completed", isComplete: true });
    });

    it("clamps at 100% once the threshold is already met, never exceeding the target", () => {
      const progress = computeRewardProgress(definitionFor("first-step"), stats({ completedMissionCount: 40 }));
      expect(progress).toEqual({ current: 1, target: 1, percent: 100, label: "1 of 1 missions completed", isComplete: true });
    });
  });
});
