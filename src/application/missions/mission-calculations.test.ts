import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import type { Goal, GoalAllocation, GoalContribution } from "@/domains/goals/types";
import { computeGoalProgress } from "@/application/goals/goal-calculations";

import {
  MISSION_TYPE_PILLAR,
  computeCategorizeTransactionsProgress,
  computeCustomMissionProgress,
  computeGoalMissionProgress,
  computeImproveConfidenceProgress,
  computeReduceDebtProgress,
  computeStayWithinBudgetProgress,
  isLiabilityAccountType,
  nextBandUp,
} from "./mission-calculations";

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

function makeContribution(goalId: string, amount: string): GoalContribution {
  return {
    id: randomUUID(),
    ownerId,
    goalId,
    amount,
    contributionDate: "2026-01-15",
    note: null,
    source: "manual",
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };
}

const noAllocations: GoalAllocation[] = [];

describe("computeStayWithinBudgetProgress", () => {
  it("is not complete mid-period, regardless of utilization", () => {
    const under = computeStayWithinBudgetProgress("active", {
      totalBudgeted: 1000,
      totalSpent: 400,
      totalRemaining: 600,
      overallProgress: 40,
    });
    expect(under.isComplete).toBe(false);
    expect(under.currentValue).toBe(40);

    const over = computeStayWithinBudgetProgress("active", {
      totalBudgeted: 1000,
      totalSpent: 1200,
      totalRemaining: -200,
      overallProgress: 120,
    });
    expect(over.isComplete).toBe(false);
  });

  it("completes only when the period is Completed AND utilization was at or under 100%", () => {
    const result = computeStayWithinBudgetProgress("completed", {
      totalBudgeted: 1000,
      totalSpent: 900,
      totalRemaining: 100,
      overallProgress: 90,
    });
    expect(result.isComplete).toBe(true);
    expect(result.percentComplete).toBe(90);
  });

  it("never completes a period that closed over budget", () => {
    const result = computeStayWithinBudgetProgress("completed", {
      totalBudgeted: 1000,
      totalSpent: 1100,
      totalRemaining: -100,
      overallProgress: 110,
    });
    expect(result.isComplete).toBe(false);
    // Display percent is clamped to 100 even though the underlying
    // utilization exceeded it — a progress bar has no ">100%" state.
    expect(result.percentComplete).toBe(100);
  });
});

describe("computeGoalMissionProgress", () => {
  it("is incomplete below target and complete at or above it", () => {
    const goal = makeGoal({ targetAmount: "1000.00" });

    const partial = computeGoalProgress(goal, [makeContribution(goal.id, "400.00")], noAllocations);
    expect(computeGoalMissionProgress(partial).isComplete).toBe(false);
    expect(computeGoalMissionProgress(partial).percentComplete).toBe(40);

    const exact = computeGoalProgress(goal, [makeContribution(goal.id, "1000.00")], noAllocations);
    expect(computeGoalMissionProgress(exact).isComplete).toBe(true);

    const over = computeGoalProgress(goal, [makeContribution(goal.id, "1500.00")], noAllocations);
    const overProgress = computeGoalMissionProgress(over);
    expect(overProgress.isComplete).toBe(true);
    // Clamped for display even though currentAmount genuinely exceeds target.
    expect(overProgress.percentComplete).toBe(100);
  });
});

describe("computeCategorizeTransactionsProgress", () => {
  it("tracks how many of the originally-uncategorized set are no longer uncategorized", () => {
    const targetIds = ["a", "b", "c"];

    const none = computeCategorizeTransactionsProgress(targetIds, new Set(["a", "b", "c"]));
    expect(none).toMatchObject({ currentValue: 0, targetValue: 3, isComplete: false });

    const some = computeCategorizeTransactionsProgress(targetIds, new Set(["c"]));
    expect(some).toMatchObject({ currentValue: 2, targetValue: 3, isComplete: false, percentComplete: expect.closeTo(66.67, 0) });

    const all = computeCategorizeTransactionsProgress(targetIds, new Set());
    expect(all).toMatchObject({ currentValue: 3, targetValue: 3, isComplete: true, percentComplete: 100 });
  });

  it("ignores a transaction id outside the original target set", () => {
    // Only "a" was in scope — "z" becoming categorized is irrelevant, and
    // "a" still being uncategorized means zero real progress, even though
    // the *current* uncategorized set shrank overall.
    const result = computeCategorizeTransactionsProgress(["a"], new Set(["a"]));
    expect(result.currentValue).toBe(0);
  });

  it("treats an empty target set as trivially complete", () => {
    expect(computeCategorizeTransactionsProgress([], new Set()).isComplete).toBe(true);
  });
});

describe("isLiabilityAccountType / computeReduceDebtProgress", () => {
  it("classifies liability account types correctly", () => {
    expect(isLiabilityAccountType("credit-card")).toBe(true);
    expect(isLiabilityAccountType("mortgage")).toBe(true);
    expect(isLiabilityAccountType("checking")).toBe(false);
    expect(isLiabilityAccountType("investment")).toBe(false);
  });

  it("tracks paydown progress and completes only at a zero (or lower) balance", () => {
    const partial = computeReduceDebtProgress(1000, 600);
    expect(partial).toMatchObject({ currentValue: 600, targetValue: 0, percentComplete: 40, isComplete: false });

    const paidOff = computeReduceDebtProgress(1000, 0);
    expect(paidOff.isComplete).toBe(true);
    expect(paidOff.percentComplete).toBe(100);
  });

  it("never shows negative progress if the balance increases", () => {
    const worse = computeReduceDebtProgress(1000, 1200);
    expect(worse.percentComplete).toBe(0);
    expect(worse.isComplete).toBe(false);
  });
});

describe("nextBandUp", () => {
  it("returns the band immediately above the given score", () => {
    expect(nextBandUp(75)?.id).toBe("strong"); // stable (70-84) -> strong
    expect(nextBandUp(60)?.id).toBe("stable"); // building (55-69) -> stable
  });

  it("returns null once already in the top band", () => {
    expect(nextBandUp(98)).toBeNull();
    expect(nextBandUp(100)).toBeNull();
  });
});

describe("computeImproveConfidenceProgress", () => {
  it("is honest (incomplete, zero progress) when the score is unavailable", () => {
    const result = computeImproveConfidenceProgress(70, 85, "Strong", null);
    expect(result.isComplete).toBe(false);
    expect(result.percentComplete).toBe(0);
  });

  it("tracks progress between the captured start and target band threshold", () => {
    const midway = computeImproveConfidenceProgress(70, 85, "Strong", 77.5);
    expect(midway.percentComplete).toBe(50);
    expect(midway.isComplete).toBe(false);

    const reached = computeImproveConfidenceProgress(70, 85, "Strong", 85);
    expect(reached.isComplete).toBe(true);
  });
});

describe("MISSION_TYPE_PILLAR", () => {
  it("maps every mission type to a real pillar id, except improve-confidence and custom", () => {
    expect(MISSION_TYPE_PILLAR["stay-within-budget"]).toBe("cashFlow");
    expect(MISSION_TYPE_PILLAR["fund-emergency-fund"]).toBe("resilience");
    expect(MISSION_TYPE_PILLAR["reach-savings-goal"]).toBe("savings");
    expect(MISSION_TYPE_PILLAR["categorize-transactions"]).toBe("financialHabits");
    expect(MISSION_TYPE_PILLAR["reduce-debt"]).toBe("debtHealth");
    expect(MISSION_TYPE_PILLAR["improve-confidence"]).toBeNull();
    expect(MISSION_TYPE_PILLAR.custom).toBeNull();
  });
});

describe("computeCustomMissionProgress", () => {
  it("is 0% and incomplete while active, and only ever reaches 100% once the status itself is completed", () => {
    const active = computeCustomMissionProgress("active");
    expect(active).toMatchObject({ percentComplete: 0, isComplete: false });

    const completed = computeCustomMissionProgress("completed");
    expect(completed).toMatchObject({ percentComplete: 100, isComplete: true });
  });

  it("treats any non-active status (including archived) as complete for display purposes", () => {
    const archived = computeCustomMissionProgress("archived");
    expect(archived.isComplete).toBe(true);
  });
});
