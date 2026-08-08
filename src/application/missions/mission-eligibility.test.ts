import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { computeGoalProgress, type GoalProgress } from "@/application/goals/goal-calculations";
import type { Account } from "@/domains/accounts/types";
import type { Goal } from "@/domains/goals/types";
import type { Mission, MissionType } from "@/domains/missions/types";

import { computeEligibleMissionCandidates, type MissionEligibilityInputs } from "./mission-eligibility";

const ownerId = randomUUID();

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: randomUUID(),
    ownerId,
    categoryId: null,
    accountId: null,
    title: "Emergency Fund",
    description: null,
    targetAmount: "1000.00",
    targetDate: null,
    goalType: "emergency-fund",
    status: "active",
    priority: "medium",
    icon: null,
    color: null,
    displayOrder: 0,
    completedAt: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    deletedAt: null,
    ...overrides,
  };
}

function makeGoalProgress(overrides: Partial<Goal> = {}): GoalProgress {
  return computeGoalProgress(makeGoal(overrides), [], []);
}

function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: randomUUID(),
    ownerId,
    institutionId: null,
    name: "Credit Card",
    accountType: "credit-card",
    maskedAccountNumber: null,
    currency: "USD",
    status: "active",
    balanceSource: "manual",
    currentBalance: "500.0000",
    openingDate: null,
    closingDate: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

function makeMission(missionType: MissionType, overrides: Partial<Mission> = {}): Mission {
  return {
    id: randomUUID(),
    ownerId,
    missionType,
    title: "x",
    description: "x",
    status: "active",
    relatedGoalId: null,
    relatedAccountId: null,
    relatedBudgetPeriodId: null,
    relatedTransactionIds: null,
    startValue: null,
    targetValue: null,
    targetBandId: null,
    difficulty: null,
    xpValue: 100,
    isDailyMission: false,
    startedAt: new Date(),
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

const baseInputs: MissionEligibilityInputs = {
  goalProgressList: [],
  activeBudgetPeriod: null,
  uncategorizedTransactionIds: [],
  liabilityAccounts: [],
  confidenceOverallScore: null,
  existingMissions: [],
};

describe("computeEligibleMissionCandidates", () => {
  it("returns no candidates when nothing is eligible", () => {
    expect(computeEligibleMissionCandidates(baseInputs)).toEqual([]);
  });

  describe("stay-within-budget", () => {
    it("is eligible only with an active budget period that has planned allocations", () => {
      const withBudget = computeEligibleMissionCandidates({
        ...baseInputs,
        activeBudgetPeriod: {
          id: "period-1",
          status: "active",
          periodLabel: "August 2026",
          totals: { totalBudgeted: 1000, totalSpent: 200, totalRemaining: 800, overallProgress: 20 },
        },
      });
      expect(withBudget.map((c) => c.missionType)).toContain("stay-within-budget");

      const emptyBudget = computeEligibleMissionCandidates({
        ...baseInputs,
        activeBudgetPeriod: {
          id: "period-1",
          status: "active",
          periodLabel: "August 2026",
          totals: { totalBudgeted: 0, totalSpent: 0, totalRemaining: 0, overallProgress: 0 },
        },
      });
      expect(emptyBudget.map((c) => c.missionType)).not.toContain("stay-within-budget");
    });

    it("is excluded once that exact period already has a non-archived mission", () => {
      const result = computeEligibleMissionCandidates({
        ...baseInputs,
        activeBudgetPeriod: {
          id: "period-1",
          status: "active",
          periodLabel: "August 2026",
          totals: { totalBudgeted: 1000, totalSpent: 200, totalRemaining: 800, overallProgress: 20 },
        },
        existingMissions: [makeMission("stay-within-budget", { relatedBudgetPeriodId: "period-1", status: "active" })],
      });
      expect(result).toEqual([]);
    });
  });

  describe("fund-emergency-fund / reach-savings-goal", () => {
    it("routes emergency-fund goals and other goal types to different mission types", () => {
      const emergencyGoal = makeGoalProgress({ goalType: "emergency-fund" });
      const vacationGoal = makeGoalProgress({ goalType: "vacation" });

      const result = computeEligibleMissionCandidates({ ...baseInputs, goalProgressList: [emergencyGoal, vacationGoal] });

      expect(result.find((c) => c.relatedGoalId === emergencyGoal.goal.id)?.missionType).toBe("fund-emergency-fund");
      expect(result.find((c) => c.relatedGoalId === vacationGoal.goal.id)?.missionType).toBe("reach-savings-goal");
    });

    it("excludes non-active goals", () => {
      const paused = makeGoalProgress({ status: "paused" });
      const result = computeEligibleMissionCandidates({ ...baseInputs, goalProgressList: [paused] });
      expect(result).toEqual([]);
    });

    it("excludes a goal that already has a non-archived mission of the matching type, but allows a new one once archived", () => {
      const goal = makeGoalProgress({ goalType: "emergency-fund" });

      const stillTaken = computeEligibleMissionCandidates({
        ...baseInputs,
        goalProgressList: [goal],
        existingMissions: [makeMission("fund-emergency-fund", { relatedGoalId: goal.goal.id, status: "completed" })],
      });
      expect(stillTaken).toEqual([]);

      const freedUp = computeEligibleMissionCandidates({
        ...baseInputs,
        goalProgressList: [goal],
        existingMissions: [makeMission("fund-emergency-fund", { relatedGoalId: goal.goal.id, status: "archived" })],
      });
      expect(freedUp).toHaveLength(1);
    });
  });

  describe("categorize-transactions", () => {
    it("is eligible only when uncategorized transactions exist", () => {
      const none = computeEligibleMissionCandidates(baseInputs);
      expect(none).toEqual([]);

      const some = computeEligibleMissionCandidates({ ...baseInputs, uncategorizedTransactionIds: ["t1", "t2"] });
      expect(some).toHaveLength(1);
      expect(some[0].relatedTransactionIds).toEqual(["t1", "t2"]);
    });
  });

  describe("reduce-debt", () => {
    it("is eligible for a liability account with a nonzero balance, never for an asset account", () => {
      const liability = makeAccount({ accountType: "credit-card", currentBalance: "250.0000" });
      const asset = makeAccount({ accountType: "checking", currentBalance: "250.0000" });

      const result = computeEligibleMissionCandidates({ ...baseInputs, liabilityAccounts: [liability, asset] });

      expect(result).toHaveLength(1);
      expect(result[0].relatedAccountId).toBe(liability.id);
    });

    it("excludes a liability account with a zero balance", () => {
      const paidOff = makeAccount({ currentBalance: "0.0000" });
      const result = computeEligibleMissionCandidates({ ...baseInputs, liabilityAccounts: [paidOff] });
      expect(result).toEqual([]);
    });
  });

  describe("improve-confidence", () => {
    it("is eligible when a score exists and isn't already in the top band", () => {
      const result = computeEligibleMissionCandidates({ ...baseInputs, confidenceOverallScore: 75 });
      expect(result.map((c) => c.missionType)).toContain("improve-confidence");
    });

    it("is excluded when the score is null or already in the top band", () => {
      expect(computeEligibleMissionCandidates({ ...baseInputs, confidenceOverallScore: null })).toEqual([]);
      expect(computeEligibleMissionCandidates({ ...baseInputs, confidenceOverallScore: 99 })).toEqual([]);
    });
  });
});
