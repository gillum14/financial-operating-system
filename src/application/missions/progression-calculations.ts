import type { MissionDifficulty } from "@/db/schema/missions";
import type { MissionRewardKey } from "@/domains/mission-progression/types";
import type { MissionType } from "@/domains/missions/types";

// Pure calculation layer for the Mission Progression System — no
// repository/DB dependency, the single canonical location for every XP,
// level, streak, and reward-eligibility formula. Deliberately has zero
// awareness of Confidence, Goals, Budgets, Accounts, or Transactions:
// every input here is either a fixed mission type/difficulty or an
// already-known progression number (totalXp, streak, completion count) —
// this file cannot duplicate or influence Confidence math because it
// never touches financial data of any kind.

// ---- XP values ----------------------------------------------------------

export const XP_BY_DIFFICULTY: Record<MissionDifficulty, number> = {
  easy: 50,
  medium: 100,
  hard: 200,
  "major-milestone": 500,
};

// Custom missions have no difficulty (they're user-authored, not
// eligibility-detected) — flat XP at the cap itself, per the explicit
// instruction "Custom missions capped at 100 XP".
export const CUSTOM_MISSION_XP = 100;

export const DAILY_MISSION_BONUS_XP = 25;

// The fixed difficulty for each of the six real, deterministic mission
// types — an explicit judgment call (not specified by the commissioning
// task), reflecting each type's real-world weight: categorizing
// transactions is quick organizational upkeep; staying within budget and
// reaching a savings goal are month-scale behaviors; paying down debt and
// crossing a Confidence band are larger, harder wins; fully funding an
// emergency reserve is the one foundational, capstone-scale mission.
// "custom" is intentionally absent — see CUSTOM_MISSION_XP above.
export const MISSION_TYPE_DIFFICULTY: Record<Exclude<MissionType, "custom">, MissionDifficulty> = {
  "categorize-transactions": "easy",
  "stay-within-budget": "medium",
  "reach-savings-goal": "medium",
  "reduce-debt": "hard",
  "improve-confidence": "hard",
  "fund-emergency-fund": "major-milestone",
};

// The one function that decides what a mission is worth — called exactly
// once, at mission creation (MissionService.startMission /
// createCustomMission), and the result is stored on the mission row
// (missions.xp_value) rather than recomputed later. That's what "XP...
// should be locked to the mission when it starts" means structurally: a
// future change to XP_BY_DIFFICULTY can never retroactively change what
// an already-started mission is worth.
export function computeMissionXpValue(missionType: MissionType): { difficulty: MissionDifficulty | null; xpValue: number } {
  if (missionType === "custom") {
    return { difficulty: null, xpValue: CUSTOM_MISSION_XP };
  }
  const difficulty = MISSION_TYPE_DIFFICULTY[missionType];
  return { difficulty, xpValue: XP_BY_DIFFICULTY[difficulty] };
}

// ---- Level ----------------------------------------------------------------

export const XP_PER_LEVEL = 1000;

export interface LevelProgress {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
}

// Level is always derived from totalXp, never stored — Level 1 starts at
// 0 XP, Level 2 at 1,000, and so on, matching "1,000 XP = 1 level"
// literally.
export function computeLevel(totalXp: number): LevelProgress {
  const safeXp = Math.max(0, totalXp);
  return {
    level: Math.floor(safeXp / XP_PER_LEVEL) + 1,
    xpIntoLevel: safeXp % XP_PER_LEVEL,
    xpForNextLevel: XP_PER_LEVEL,
  };
}

// ---- Streak (one grace day) ------------------------------------------------

export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  lastQualifyingCompletionDate: string | null;
}

function daysBetween(fromDate: string, toDate: string): number {
  const from = new Date(`${fromDate}T00:00:00Z`).getTime();
  const to = new Date(`${toDate}T00:00:00Z`).getTime();
  return Math.round((to - from) / (1000 * 60 * 60 * 24));
}

// Every mission completion is a qualifying streak event. "One grace day"
// means a gap of exactly one skipped calendar day (2 days between
// completions) still extends the streak; a completion on the very next
// day (1 day apart) is the plain consecutive case; the same calendar day
// as the last qualifying completion is a no-op (multiple completions in
// one day don't inflate the streak); anything wider than the grace window
// breaks it, restarting at 1 (today's completion still counts as day one
// of a new streak, never zero).
export function computeStreakUpdate(state: StreakState, completionDate: string): StreakState {
  if (state.lastQualifyingCompletionDate === completionDate) {
    return state;
  }

  const gap = state.lastQualifyingCompletionDate ? daysBetween(state.lastQualifyingCompletionDate, completionDate) : null;
  const newStreak = gap !== null && gap >= 1 && gap <= 2 ? state.currentStreak + 1 : 1;

  return {
    currentStreak: newStreak,
    longestStreak: Math.max(state.longestStreak, newStreak),
    lastQualifyingCompletionDate: completionDate,
  };
}

// ---- Rewards ----------------------------------------------------------------

export interface MissionRewardEligibilityStats {
  completedMissionCount: number;
  currentStreak: number;
  level: number;
  hasCompletedMajorMilestone: boolean;
}

export interface MissionRewardDefinition {
  key: MissionRewardKey;
  title: string;
  description: string;
  isEligible: (stats: MissionRewardEligibilityStats) => boolean;
}

// The 8 initial rewards, in the exact order given — each a deterministic
// threshold check against real progression numbers, never a scored or
// AI-suggested unlock.
export const REWARD_DEFINITIONS: MissionRewardDefinition[] = [
  { key: "first-step", title: "First Step", description: "Complete 1 mission.", isEligible: (s) => s.completedMissionCount >= 1 },
  { key: "momentum", title: "Momentum", description: "Complete 5 missions.", isEligible: (s) => s.completedMissionCount >= 5 },
  {
    key: "building-habits",
    title: "Building Habits",
    description: "Complete 10 missions.",
    isEligible: (s) => s.completedMissionCount >= 10,
  },
  { key: "on-a-roll", title: "On a Roll", description: "Reach a 7-day streak.", isEligible: (s) => s.currentStreak >= 7 },
  { key: "consistency", title: "Consistency", description: "Reach a 30-day streak.", isEligible: (s) => s.currentStreak >= 30 },
  { key: "level-up", title: "Level Up", description: "Reach Level 5.", isEligible: (s) => s.level >= 5 },
  { key: "financial-builder", title: "Financial Builder", description: "Reach Level 10.", isEligible: (s) => s.level >= 10 },
  {
    key: "major-win",
    title: "Major Win",
    description: "Complete a Major Milestone mission.",
    isEligible: (s) => s.hasCompletedMajorMilestone,
  },
];

// Every definition not already in `alreadyUnlockedKeys` whose eligibility
// rule is now satisfied — meant to be called after every completion,
// unconditionally; re-unlocking an already-unlocked reward is filtered
// out here AND blocked again at the database layer (the unique (owner,
// rewardKey) index), so this is safe to over-call.
export function computeNewlyEligibleRewards(
  stats: MissionRewardEligibilityStats,
  alreadyUnlockedKeys: ReadonlySet<MissionRewardKey>,
): MissionRewardDefinition[] {
  return REWARD_DEFINITIONS.filter((reward) => !alreadyUnlockedKeys.has(reward.key) && reward.isEligible(stats));
}
