import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import type { Goal, GoalAllocation, GoalContribution } from "@/domains/goals/types";

import {
  computeAccountAllocationSummary,
  computeAllocatedAmount,
  computeCurrentAmount,
  computeGoalHealth,
  computeGoalProgress,
  deriveUpcomingObjectives,
  type GoalProgress,
} from "./goal-calculations";

const ownerId = randomUUID();

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: randomUUID(),
    ownerId,
    categoryId: null,
    accountId: null,
    title: "Emergency Fund",
    description: null,
    targetAmount: "10000.00",
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

function makeContribution(goalId: string, amount: string, overrides: Partial<GoalContribution> = {}): GoalContribution {
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
    ...overrides,
  };
}

// Builds a GoalProgress directly (bypassing computeGoalProgress) so
// deriveUpcomingObjectives tests can control percentComplete/health
// precisely without fussing over the date math computeGoalHealth needs —
// that math is already covered by the computeGoalHealth suite above.
function makeProgress(goalOverrides: Partial<Goal>, progressOverrides: Partial<GoalProgress> = {}): GoalProgress {
  const goal = makeGoal(goalOverrides);
  const targetAmount = Number(goal.targetAmount);
  return {
    goal,
    allocatedAmount: 0,
    manualContributionsAmount: 0,
    currentAmount: 0,
    targetAmount,
    remainingAmount: targetAmount,
    percentComplete: 0,
    health: "on-track",
    projectedCompletionDate: null,
    completedDate: null,
    ...progressOverrides,
  };
}

function makeAllocation(goalId: string, accountId: string, amount: string, overrides: Partial<GoalAllocation> = {}): GoalAllocation {
  return {
    id: randomUUID(),
    ownerId,
    goalId,
    accountId,
    amount,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

describe("computeCurrentAmount", () => {
  it("sums every contribution's amount", () => {
    const goalId = randomUUID();
    const contributions = [makeContribution(goalId, "100.00"), makeContribution(goalId, "250.50")];
    expect(computeCurrentAmount(contributions)).toBe(350.5);
  });

  it("no contributions: current amount is honestly 0", () => {
    expect(computeCurrentAmount([])).toBe(0);
  });
});

describe("computeAllocatedAmount", () => {
  it("sums every allocation's amount across however many accounts", () => {
    const goalId = randomUUID();
    const allocations = [
      makeAllocation(goalId, randomUUID(), "2000.00"),
      makeAllocation(goalId, randomUUID(), "3000.00"),
    ];
    expect(computeAllocatedAmount(allocations)).toBe(5000);
  });

  it("no allocations: allocated amount is honestly 0", () => {
    expect(computeAllocatedAmount([])).toBe(0);
  });
});

describe("computeGoalHealth", () => {
  it("completed status always overrides to 'completed' regardless of pace", () => {
    const goal = makeGoal({ status: "completed", targetDate: "2020-01-01" });
    expect(computeGoalHealth(goal, 10, new Date("2026-01-01T00:00:00Z"))).toBe("completed");
  });

  describe("with a target date", () => {
    it("ahead of pace by more than 10 points is excellent", () => {
      const goal = makeGoal({ createdAt: new Date("2026-01-01T00:00:00Z"), targetDate: "2026-01-11" });
      // 5 of 10 days elapsed (50% expected); 80% actual is +30 ahead.
      const health = computeGoalHealth(goal, 80, new Date("2026-01-06T00:00:00Z"));
      expect(health).toBe("excellent");
    });

    it("within +/-10 points of expected pace is on-track", () => {
      const goal = makeGoal({ createdAt: new Date("2026-01-01T00:00:00Z"), targetDate: "2026-01-11" });
      // 50% expected, 55% actual — within band.
      const health = computeGoalHealth(goal, 55, new Date("2026-01-06T00:00:00Z"));
      expect(health).toBe("on-track");
    });

    it("more than 10 points behind expected pace is behind", () => {
      const goal = makeGoal({ createdAt: new Date("2026-01-01T00:00:00Z"), targetDate: "2026-01-11" });
      // 50% expected, 20% actual — 30 behind.
      const health = computeGoalHealth(goal, 20, new Date("2026-01-06T00:00:00Z"));
      expect(health).toBe("behind");
    });
  });

  describe("without a target date (flat thresholds)", () => {
    it(">=75% is excellent", () => {
      const goal = makeGoal({ targetDate: null });
      expect(computeGoalHealth(goal, 80)).toBe("excellent");
    });

    it("25-75% is on-track", () => {
      const goal = makeGoal({ targetDate: null });
      expect(computeGoalHealth(goal, 50)).toBe("on-track");
    });

    it("<25% is behind", () => {
      const goal = makeGoal({ targetDate: null });
      expect(computeGoalHealth(goal, 10)).toBe("behind");
    });
  });
});

describe("computeGoalProgress", () => {
  it("derives currentAmount from contributions alone when there are no allocations", () => {
    const goal = makeGoal({ targetAmount: "1000.00" });
    const contributions = [makeContribution(goal.id, "400.00")];

    const progress = computeGoalProgress(goal, contributions, []);

    expect(progress.allocatedAmount).toBe(0);
    expect(progress.manualContributionsAmount).toBe(400);
    expect(progress.currentAmount).toBe(400);
    expect(progress.targetAmount).toBe(1000);
    expect(progress.remainingAmount).toBe(600);
    expect(progress.percentComplete).toBe(40);
  });

  it("derives currentAmount from allocations alone when there are no manual contributions", () => {
    const goal = makeGoal({ targetAmount: "1000.00" });
    const allocations = [makeAllocation(goal.id, randomUUID(), "1000.00")];

    const progress = computeGoalProgress(goal, [], allocations);

    expect(progress.allocatedAmount).toBe(1000);
    expect(progress.manualContributionsAmount).toBe(0);
    expect(progress.currentAmount).toBe(1000);
    expect(progress.percentComplete).toBe(100);
  });

  // "Avoid double counting when a manual contribution is also represented
  // by an allocated account balance" — the two ledgers are additive by
  // construction (never merged or de-duplicated at read time), so a mixed
  // goal's total is honestly the sum of both, never just one or the other.
  it("no double counting: allocated and manual amounts are additive, not merged or deduplicated", () => {
    const goal = makeGoal({ targetAmount: "1000.00" });
    const contributions = [makeContribution(goal.id, "300.00")];
    const allocations = [makeAllocation(goal.id, randomUUID(), "400.00")];

    const progress = computeGoalProgress(goal, contributions, allocations);

    expect(progress.allocatedAmount).toBe(400);
    expect(progress.manualContributionsAmount).toBe(300);
    expect(progress.currentAmount).toBe(700);
    expect(progress.percentComplete).toBe(70);
  });

  it("overfunded via allocations alone produces a negative remainingAmount and >100% complete, unclamped", () => {
    const goal = makeGoal({ targetAmount: "1000.00" });
    const allocations = [makeAllocation(goal.id, randomUUID(), "1200.00")];

    const progress = computeGoalProgress(goal, [], allocations);

    expect(progress.remainingAmount).toBe(-200);
    expect(progress.percentComplete).toBe(120);
  });

  it("overfunded via a mix of allocations and contributions, neither alone reaching the target", () => {
    const goal = makeGoal({ targetAmount: "1000.00" });
    const contributions = [makeContribution(goal.id, "600.00")];
    const allocations = [makeAllocation(goal.id, randomUUID(), "700.00")];

    const progress = computeGoalProgress(goal, contributions, allocations);

    expect(progress.currentAmount).toBe(1300);
    expect(progress.remainingAmount).toBe(-300);
    expect(progress.percentComplete).toBe(130);
  });

  it("zero target amount never divides by zero — percentComplete is 0", () => {
    const goal = makeGoal({ targetAmount: "0.00" });
    const progress = computeGoalProgress(goal, [], []);
    expect(progress.percentComplete).toBe(0);
  });

  it("projectedCompletionDate is always null — no forecasting engine", () => {
    const goal = makeGoal();
    const progress = computeGoalProgress(goal, [], []);
    expect(progress.projectedCompletionDate).toBeNull();
  });

  it("completedDate reflects the goal's own completedAt, formatted as a date string", () => {
    const goal = makeGoal({ status: "completed", completedAt: new Date("2026-03-25T00:00:00Z") });
    const progress = computeGoalProgress(goal, [], []);
    expect(progress.completedDate).toBe("2026-03-25");
  });

  it("no completedAt: completedDate is null, not fabricated", () => {
    const goal = makeGoal();
    const progress = computeGoalProgress(goal, [], []);
    expect(progress.completedDate).toBeNull();
  });
});

describe("computeAccountAllocationSummary", () => {
  it("partial allocation: unallocatedBalance is the honest remainder", () => {
    const accountId = randomUUID();
    const allocations = [makeAllocation(randomUUID(), accountId, "2000.00"), makeAllocation(randomUUID(), accountId, "500.00")];

    const summary = computeAccountAllocationSummary(accountId, 10000, allocations);

    expect(summary.availableBalance).toBe(10000);
    expect(summary.allocatedAmount).toBe(2500);
    expect(summary.unallocatedBalance).toBe(7500);
    expect(summary.isOverCommitted).toBe(false);
  });

  it("exact full allocation: unallocatedBalance is exactly 0, not a rounding artifact", () => {
    const accountId = randomUUID();
    const allocations = [makeAllocation(randomUUID(), accountId, "8000.00")];

    const summary = computeAccountAllocationSummary(accountId, 8000, allocations);

    expect(summary.unallocatedBalance).toBe(0);
    expect(summary.isOverCommitted).toBe(false);
  });

  it("over-committed: allocations exceeding a since-reduced balance are surfaced, not hidden", () => {
    const accountId = randomUUID();
    // Simulates an account balance that dropped after allocations were
    // already made (the trigger only guards allocation-write time, never
    // retroactively re-validates existing allocations).
    const allocations = [makeAllocation(randomUUID(), accountId, "5000.00")];

    const summary = computeAccountAllocationSummary(accountId, 3000, allocations);

    expect(summary.unallocatedBalance).toBe(-2000);
    expect(summary.isOverCommitted).toBe(true);
  });

  it("no balance set: availableBalance is honestly 0, not fabricated", () => {
    const accountId = randomUUID();
    const summary = computeAccountAllocationSummary(accountId, null, []);
    expect(summary.availableBalance).toBe(0);
    expect(summary.unallocatedBalance).toBe(0);
  });

  it("no allocations: the entire balance is unallocated", () => {
    const accountId = randomUUID();
    const summary = computeAccountAllocationSummary(accountId, 10000, []);
    expect(summary.allocatedAmount).toBe(0);
    expect(summary.unallocatedBalance).toBe(10000);
  });
});

describe("deriveUpcomingObjectives", () => {
  const asOf = new Date("2026-08-07T00:00:00Z");

  it("near-completion (>=90%) generates an objective, even at low priority with no other signal", () => {
    const progress = makeProgress({ title: "Almost There", priority: "low", targetDate: null }, { percentComplete: 95, health: "on-track" });
    const objectives = deriveUpcomingObjectives([progress], asOf);

    expect(objectives).toHaveLength(1);
    expect(objectives[0].goalId).toBe(progress.goal.id);
    expect(objectives[0].reason).toMatch(/95% funded/);
  });

  it("behind health generates an objective regardless of priority", () => {
    const progress = makeProgress({ title: "Falling Behind", priority: "low", targetDate: null }, { percentComplete: 40, health: "behind" });
    const objectives = deriveUpcomingObjectives([progress], asOf);

    expect(objectives).toHaveLength(1);
    expect(objectives[0].reason).toMatch(/Behind pace/);
  });

  it("a target date within 60 days generates an objective when not near-completion or behind", () => {
    const targetDate = "2026-09-01"; // 25 days after asOf
    const progress = makeProgress(
      { title: "Due Soon", priority: "low", targetDate },
      { percentComplete: 50, health: "on-track" },
    );
    const objectives = deriveUpcomingObjectives([progress], asOf);

    expect(objectives).toHaveLength(1);
    expect(objectives[0].reason).toMatch(/Target date in 25 days/);
  });

  it("a target date more than 60 days out does not generate an objective on its own", () => {
    const targetDate = "2026-12-01"; // well beyond the 60-day window
    const progress = makeProgress(
      { title: "Not Yet", priority: "low", targetDate },
      { percentComplete: 50, health: "on-track" },
    );
    expect(deriveUpcomingObjectives([progress], asOf)).toHaveLength(0);
  });

  it("high priority generates an objective when no other signal matches", () => {
    const progress = makeProgress(
      { title: "Important To Me", priority: "high", targetDate: null },
      { percentComplete: 50, health: "on-track" },
    );
    const objectives = deriveUpcomingObjectives([progress], asOf);

    expect(objectives).toHaveLength(1);
    expect(objectives[0].reason).toMatch(/high priority/i);
  });

  it("medium or low priority with no other signal generates no objective", () => {
    const medium = makeProgress({ title: "Medium", priority: "medium", targetDate: null }, { percentComplete: 50, health: "on-track" });
    const low = makeProgress({ title: "Low", priority: "low", targetDate: null }, { percentComplete: 50, health: "on-track" });
    expect(deriveUpcomingObjectives([medium, low], asOf)).toHaveLength(0);
  });

  it("paused goals never generate an objective, even if they'd otherwise qualify", () => {
    const progress = makeProgress(
      { title: "Paused But Urgent", status: "paused", priority: "high" },
      { percentComplete: 95, health: "behind" },
    );
    expect(deriveUpcomingObjectives([progress], asOf)).toHaveLength(0);
  });

  it("completed goals never generate an objective", () => {
    const progress = makeProgress({ title: "Done", status: "completed", priority: "high" }, { percentComplete: 100, health: "completed" });
    expect(deriveUpcomingObjectives([progress], asOf)).toHaveLength(0);
  });

  it("archived goals never generate an objective", () => {
    const progress = makeProgress({ title: "Put Away", status: "archived", priority: "high" }, { percentComplete: 50, health: "behind" });
    expect(deriveUpcomingObjectives([progress], asOf)).toHaveLength(0);
  });

  it("a goal matching multiple signals only produces one objective, using the highest-ranked reason", () => {
    // Near-completion AND behind AND high priority — only the
    // near-completion reason (the highest-ranked) should be used.
    const progress = makeProgress(
      { title: "Multi-Signal", priority: "high", targetDate: "2026-08-20" },
      { percentComplete: 92, health: "behind" },
    );
    const objectives = deriveUpcomingObjectives([progress], asOf);

    expect(objectives).toHaveLength(1);
    expect(objectives[0].reason).toMatch(/funded/);
  });

  it("caps the result at 4 and orders by urgency rank, then title alphabetically within the same rank", () => {
    const progressList = ["Zebra", "Yak", "Xerus", "Wolf", "Vole"].map((title) =>
      makeProgress({ title, priority: "low", targetDate: null }, { percentComplete: 95, health: "on-track" }),
    );
    const objectives = deriveUpcomingObjectives(progressList, asOf);

    expect(objectives).toHaveLength(4);
    expect(objectives.map((objective) => objective.title)).toEqual(["Vole", "Wolf", "Xerus", "Yak"]);
  });

  it("no active goals: returns an empty array, not null or an error", () => {
    expect(deriveUpcomingObjectives([], asOf)).toEqual([]);
  });
});
