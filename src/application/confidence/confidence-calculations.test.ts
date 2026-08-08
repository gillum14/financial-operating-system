import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import type { GoalProgress } from "@/application/goals/goal-calculations";
import type { CategoryBalanceChange, NetWorthChange, NetWorthOverviewView } from "@/application/net-worth/net-worth-views";
import type { Account, AccountType } from "@/domains/accounts/types";
import type { Goal, GoalPriority, GoalStatus, GoalType } from "@/domains/goals/types";
import type { Transaction, TransactionType } from "@/domains/transactions/types";

import { bandForScore, computeConfidenceScore, PILLAR_IDS, PILLAR_WEIGHTS, type ConfidenceCalculationInputs } from "./confidence-calculations";

function makeAccount(accountType: AccountType, currentBalance: string | null, overrides: Partial<Account> = {}): Account {
  const now = new Date();
  return {
    id: randomUUID(),
    ownerId: "owner-1",
    institutionId: null,
    name: "Test Account",
    accountType,
    maskedAccountNumber: null,
    currency: "USD",
    status: "active",
    balanceSource: "manual",
    currentBalance,
    openingDate: null,
    closingDate: null,
    notes: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  };
}

function makeTransaction(
  transactionType: TransactionType,
  amount: string,
  overrides: Partial<Transaction> = {},
): Transaction {
  const now = new Date();
  return {
    id: randomUUID(),
    ownerId: "owner-1",
    accountId: randomUUID(),
    categoryId: null,
    transactionDate: "2026-08-01",
    postingDate: null,
    originalDescription: "TXN",
    merchant: null,
    amount,
    transactionType,
    isExcluded: false,
    notes: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  };
}

function makeGoal(goalType: GoalType, status: GoalStatus = "active", overrides: Partial<Goal> = {}): Goal {
  const now = new Date();
  return {
    id: randomUUID(),
    ownerId: "owner-1",
    categoryId: null,
    accountId: null,
    title: "Test Goal",
    description: null,
    targetAmount: "1000.0000",
    targetDate: null,
    goalType,
    status,
    priority: "medium" as GoalPriority,
    icon: null,
    color: null,
    displayOrder: 0,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  };
}

function makeGoalProgress(goal: Goal, percentComplete: number, health: GoalProgress["health"]): GoalProgress {
  return {
    goal,
    allocatedAmount: 0,
    manualContributionsAmount: 0,
    currentAmount: (percentComplete / 100) * Number(goal.targetAmount),
    targetAmount: Number(goal.targetAmount),
    remainingAmount: Number(goal.targetAmount) * (1 - percentComplete / 100),
    percentComplete,
    health,
    projectedCompletionDate: null,
    completedDate: null,
  };
}

function makeChange(comparisonDate: string, absoluteChange: number, percentChange: number | null): NetWorthChange {
  return { comparisonDate, absoluteChange, percentChange };
}

function makeCategoryChange(accountType: AccountType, currentAmount: number, comparisonAmount: number): CategoryBalanceChange {
  return { accountType, currentAmount, comparisonAmount, absoluteChange: currentAmount - comparisonAmount };
}

function makeNetWorthOverview(overrides: Partial<NetWorthOverviewView> = {}): NetWorthOverviewView {
  return {
    netWorth: 0,
    totalAssets: 0,
    totalLiabilities: 0,
    assetsByCategory: [],
    liabilitiesByCategory: [],
    hasAccounts: false,
    history: [],
    hasHistory: false,
    netWorthChange: null,
    totalAssetsChange: null,
    totalLiabilitiesChange: null,
    accountBalanceChanges: [],
    assetCategoryChanges: [],
    liabilityCategoryChanges: [],
    ...overrides,
  };
}

function makeInputs(overrides: Partial<ConfidenceCalculationInputs> = {}): ConfidenceCalculationInputs {
  return {
    asOf: new Date("2026-08-07T12:00:00Z"),
    activeAccounts: [],
    transactions30d: [],
    transactions90d: [],
    activeBudgetTotals: null,
    goalProgressList: [],
    netWorth: makeNetWorthOverview(),
    ...overrides,
  };
}

describe("PILLAR_WEIGHTS", () => {
  it("sums to exactly 1 across all 8 pillars — the authoritative spec weights", () => {
    const total = PILLAR_IDS.reduce((sum, id) => sum + PILLAR_WEIGHTS[id], 0);
    expect(total).toBeCloseTo(1, 10);
  });

  it("matches confidence-engine.md's exact per-pillar weights", () => {
    expect(PILLAR_WEIGHTS.cashFlow).toBe(0.2);
    expect(PILLAR_WEIGHTS.resilience).toBe(0.2);
    expect(PILLAR_WEIGHTS.debtHealth).toBe(0.15);
    expect(PILLAR_WEIGHTS.savings).toBe(0.1);
    expect(PILLAR_WEIGHTS.investing).toBe(0.1);
    expect(PILLAR_WEIGHTS.retirement).toBe(0.1);
    expect(PILLAR_WEIGHTS.financialHabits).toBe(0.1);
    expect(PILLAR_WEIGHTS.progressTrajectory).toBe(0.05);
  });
});

describe("bandForScore", () => {
  it.each([
    [100, "Exceptional"],
    [95, "Exceptional"],
    [94, "Strong"],
    [85, "Strong"],
    [84, "Stable"],
    [70, "Stable"],
    [69, "Building"],
    [55, "Building"],
    [54, "Vulnerable"],
    [40, "Vulnerable"],
    [39, "At Risk"],
    [0, "At Risk"],
  ])("scores exactly %i maps to band %s (boundary)", (score, expectedLabel) => {
    expect(bandForScore(score).label).toBe(expectedLabel);
  });
});

describe("computeConfidenceScore — missing data", () => {
  it("returns a null overall score and null band when every pillar is unavailable", () => {
    const result = computeConfidenceScore(makeInputs());

    expect(result.overallScore).toBeNull();
    expect(result.band).toBeNull();
    expect(result.pillars.every((pillar) => pillar.status === "unavailable")).toBe(true);
  });

  it("never scores an unavailable pillar as 0 or a fabricated neutral 50 — it is excluded, not defaulted", () => {
    const result = computeConfidenceScore(makeInputs());
    for (const pillar of result.pillars) {
      expect(pillar.score).toBeNull();
      expect(pillar.effectiveWeight).toBe(0);
    }
  });

  it("renormalizes remaining pillar weights when some pillars are unavailable (weighting)", () => {
    // Only Cash Flow has evidence (one income transaction); every other
    // pillar has none.
    const inputs = makeInputs({
      transactions30d: [makeTransaction("income", "1000.00")],
    });
    const result = computeConfidenceScore(inputs);

    const cashFlow = result.pillars.find((p) => p.id === "cashFlow")!;
    expect(cashFlow.status).toBe("available");
    // Cash Flow is the only available pillar, so its effective weight
    // must be renormalized to 100% of the total, not its raw 20%.
    expect(cashFlow.effectiveWeight).toBeCloseTo(1, 10);
    expect(result.overallScore).toBe(cashFlow.score === null ? null : Math.round(cashFlow.score));

    const unavailablePillars = result.pillars.filter((p) => p.id !== "cashFlow");
    expect(unavailablePillars.every((p) => p.effectiveWeight === 0)).toBe(true);
  });

  it("every signal, available or not, carries a reason code explaining the evidence", () => {
    const result = computeConfidenceScore(makeInputs());
    for (const pillar of result.pillars) {
      for (const signal of pillar.signals) {
        expect(signal.reasonCode).toBeTruthy();
        expect(signal.message).toBeTruthy();
      }
    }
  });

  it("permanently out-of-scope measures (e.g. insurance, diversification, employer match) always emit an unavailable NOT_MEASURED_V1 signal, never affecting the pillar score", () => {
    const result = computeConfidenceScore(makeInputs());
    const resilience = result.pillars.find((p) => p.id === "resilience")!;
    const insurance = resilience.signals.find((s) => s.id === "resilience.insurance-coverage")!;
    expect(insurance.status).toBe("unavailable");
    expect(insurance.reasonCode).toBe("NOT_MEASURED_V1");
    expect(insurance.score).toBeNull();
  });
});

describe("computeConfidenceScore — overall score math and strong/weak/mixed states", () => {
  it("computes a strong overall score when every measurable signal is strong", () => {
    const inputs = makeInputs({
      activeAccounts: [
        makeAccount("checking", "20000.00"),
        makeAccount("savings", "20000.00"),
        makeAccount("investment", "10000.00"),
        makeAccount("retirement", "10000.00"),
      ],
      transactions30d: [makeTransaction("income", "5000.00"), makeTransaction("expense", "-2000.00")],
      transactions90d: [
        makeTransaction("income", "15000.00"),
        makeTransaction("expense", "-3000.00", { categoryId: randomUUID() }),
      ],
      activeBudgetTotals: { totalBudgeted: 3000, totalSpent: 2000, overallProgress: (2000 / 3000) * 100 },
      goalProgressList: [
        makeGoalProgress(makeGoal("emergency-fund"), 100, "completed"),
        makeGoalProgress(makeGoal("general-savings"), 90, "excellent"),
      ],
      netWorth: makeNetWorthOverview({
        totalAssets: 60000,
        totalLiabilities: 1000,
        hasHistory: true,
        netWorthChange: makeChange("2026-07-01", 5000, 15),
        totalLiabilitiesChange: makeChange("2026-07-01", -200, -20),
        assetCategoryChanges: [
          makeCategoryChange("savings", 20000, 18000),
          makeCategoryChange("investment", 10000, 9000),
          makeCategoryChange("retirement", 10000, 9000),
        ],
      }),
    });

    const result = computeConfidenceScore(inputs);

    expect(result.overallScore).not.toBeNull();
    expect(result.overallScore!).toBeGreaterThanOrEqual(70);
    expect(result.band!.id === "stable" || result.band!.id === "strong" || result.band!.id === "exceptional").toBe(true);
  });

  it("computes a weak overall score when every measurable signal is weak", () => {
    const inputs = makeInputs({
      activeAccounts: [makeAccount("credit-card", "-5000.00")],
      transactions30d: [makeTransaction("expense", "-2000.00")],
      transactions90d: [makeTransaction("expense", "-6000.00")],
      activeBudgetTotals: { totalBudgeted: 1000, totalSpent: 3000, overallProgress: 300 },
      goalProgressList: [makeGoalProgress(makeGoal("general-savings"), 5, "behind")],
      netWorth: makeNetWorthOverview({
        totalAssets: 0,
        totalLiabilities: 5000,
        hasHistory: true,
        netWorthChange: makeChange("2026-07-01", -2000, -40),
        totalLiabilitiesChange: makeChange("2026-07-01", 1000, 25),
      }),
    });

    const result = computeConfidenceScore(inputs);

    expect(result.overallScore).not.toBeNull();
    expect(result.overallScore!).toBeLessThanOrEqual(40);
  });

  it("computes a mixed-in-between score when some signals are strong and others weak", () => {
    const strongInputs = makeInputs({
      transactions30d: [makeTransaction("income", "5000.00"), makeTransaction("expense", "-1000.00")],
    });
    const weakInputs = makeInputs({
      transactions30d: [makeTransaction("expense", "-2000.00")],
    });
    const mixedInputs = makeInputs({
      transactions30d: [...strongInputs.transactions30d, ...weakInputs.transactions30d],
    });

    const strong = computeConfidenceScore(strongInputs).pillars.find((p) => p.id === "cashFlow")!.score!;
    const weak = computeConfidenceScore(weakInputs).pillars.find((p) => p.id === "cashFlow")!.score!;
    const mixed = computeConfidenceScore(mixedInputs).pillars.find((p) => p.id === "cashFlow")!.score!;

    // The mixed case combines both transaction sets into one 30-day
    // window (net cash flow, not two averaged signals), so it should land
    // strictly between the two single-signal extremes, not equal either.
    expect(mixed).toBeGreaterThan(weak);
    expect(mixed).toBeLessThan(strong);
  });

  it("rounds the overall score to the nearest whole number", () => {
    const result = computeConfidenceScore(
      makeInputs({ transactions30d: [makeTransaction("income", "1000.00"), makeTransaction("expense", "-333.00")] }),
    );
    expect(Number.isInteger(result.overallScore)).toBe(true);
  });
});

describe("Cash Flow — budget overspending", () => {
  it("scores budget adherence positively when spending is within plan", () => {
    const result = computeConfidenceScore(
      makeInputs({ activeBudgetTotals: { totalBudgeted: 1000, totalSpent: 500, overallProgress: 50 } }),
    );
    const signal = result.pillars.find((p) => p.id === "cashFlow")!.signals.find((s) => s.id === "cash-flow.budget-adherence")!;
    expect(signal.polarity).toBe("positive");
    expect(signal.reasonCode).toBe("WITHIN_BUDGET");
    expect(signal.score).toBe(100);
  });

  it("scores budget adherence negatively when overspending, decreasing further the more over-budget it is", () => {
    const overBy50 = computeConfidenceScore(
      makeInputs({ activeBudgetTotals: { totalBudgeted: 1000, totalSpent: 1500, overallProgress: 150 } }),
    ).pillars.find((p) => p.id === "cashFlow")!.signals.find((s) => s.id === "cash-flow.budget-adherence")!;
    const overBy100 = computeConfidenceScore(
      makeInputs({ activeBudgetTotals: { totalBudgeted: 1000, totalSpent: 2000, overallProgress: 200 } }),
    ).pillars.find((p) => p.id === "cashFlow")!.signals.find((s) => s.id === "cash-flow.budget-adherence")!;

    expect(overBy50.polarity).toBe("negative");
    expect(overBy50.reasonCode).toBe("OVER_BUDGET");
    expect(overBy50.score).toBe(50);
    expect(overBy100.score).toBe(0);
    expect(overBy100.score!).toBeLessThan(overBy50.score!);
  });

  it("marks budget adherence unavailable (not 0) when there is no active budget", () => {
    const result = computeConfidenceScore(makeInputs({ activeBudgetTotals: null }));
    const signal = result.pillars.find((p) => p.id === "cashFlow")!.signals.find((s) => s.id === "cash-flow.budget-adherence")!;
    expect(signal.status).toBe("unavailable");
    expect(signal.score).toBeNull();
  });
});

describe("Savings — goal progress", () => {
  it("scores savings goal funding from real goal percentComplete, averaged across savings-type goals", () => {
    const goalA = makeGoalProgress(makeGoal("emergency-fund"), 80, "on-track");
    const goalB = makeGoalProgress(makeGoal("general-savings"), 40, "behind");
    const result = computeConfidenceScore(makeInputs({ goalProgressList: [goalA, goalB] }));
    const signal = result.pillars.find((p) => p.id === "savings")!.signals.find((s) => s.id === "savings.goal-funding")!;
    expect(signal.score).toBeCloseTo(60, 10);
  });

  it("excludes non-savings-type goals from the savings goal-funding signal", () => {
    const vacationGoal = makeGoalProgress(makeGoal("vacation"), 10, "behind");
    const result = computeConfidenceScore(makeInputs({ goalProgressList: [vacationGoal] }));
    const signal = result.pillars.find((p) => p.id === "savings")!.signals.find((s) => s.id === "savings.goal-funding")!;
    expect(signal.status).toBe("unavailable");
  });

  it("is unavailable, not zero, when the owner has no savings-type goals at all", () => {
    const result = computeConfidenceScore(makeInputs());
    const signal = result.pillars.find((p) => p.id === "savings")!.signals.find((s) => s.id === "savings.goal-funding")!;
    expect(signal.status).toBe("unavailable");
    expect(signal.score).toBeNull();
  });
});

describe("Debt Health — improvement and worsening", () => {
  it("scores the debt trend positively when liabilities decreased since the comparison snapshot", () => {
    const result = computeConfidenceScore(
      makeInputs({
        netWorth: makeNetWorthOverview({ hasHistory: true, totalLiabilitiesChange: makeChange("2026-07-01", -500, -10) }),
      }),
    );
    const signal = result.pillars.find((p) => p.id === "debtHealth")!.signals.find((s) => s.id === "debt-health.trend")!;
    expect(signal.polarity).toBe("positive");
    expect(signal.reasonCode).toBe("LIABILITIES_DECREASING");
    expect(signal.score!).toBeGreaterThan(50);
  });

  it("scores the debt trend negatively when liabilities increased since the comparison snapshot", () => {
    const result = computeConfidenceScore(
      makeInputs({
        netWorth: makeNetWorthOverview({ hasHistory: true, totalLiabilitiesChange: makeChange("2026-07-01", 500, 10) }),
      }),
    );
    const signal = result.pillars.find((p) => p.id === "debtHealth")!.signals.find((s) => s.id === "debt-health.trend")!;
    expect(signal.polarity).toBe("negative");
    expect(signal.reasonCode).toBe("LIABILITIES_INCREASING");
    expect(signal.score!).toBeLessThan(50);
  });

  it("is unavailable, not neutral, when there is no historical Net Worth snapshot yet", () => {
    const result = computeConfidenceScore(makeInputs({ netWorth: makeNetWorthOverview({ hasHistory: false }) }));
    const signal = result.pillars.find((p) => p.id === "debtHealth")!.signals.find((s) => s.id === "debt-health.trend")!;
    expect(signal.status).toBe("unavailable");
  });

  it("scores the liability ratio from real Net Worth totals, worse as liabilities grow relative to assets", () => {
    const low = computeConfidenceScore(makeInputs({ netWorth: makeNetWorthOverview({ totalAssets: 10000, totalLiabilities: 1000 }) }))
      .pillars.find((p) => p.id === "debtHealth")!
      .signals.find((s) => s.id === "debt-health.liability-ratio")!;
    const high = computeConfidenceScore(makeInputs({ netWorth: makeNetWorthOverview({ totalAssets: 10000, totalLiabilities: 8000 }) }))
      .pillars.find((p) => p.id === "debtHealth")!
      .signals.find((s) => s.id === "debt-health.liability-ratio")!;
    expect(low.score!).toBeGreaterThan(high.score!);
  });
});

describe("Progress & Trajectory — Net Worth improvement and decline", () => {
  it("scores the Net Worth trend positively when net worth grew since the comparison snapshot", () => {
    const result = computeConfidenceScore(
      makeInputs({ netWorth: makeNetWorthOverview({ hasHistory: true, netWorthChange: makeChange("2026-07-01", 1000, 20) }) }),
    );
    const signal = result.pillars.find((p) => p.id === "progressTrajectory")!.signals.find((s) => s.id === "progress.net-worth-trend")!;
    expect(signal.polarity).toBe("positive");
    expect(signal.reasonCode).toBe("NET_WORTH_GROWING");
  });

  it("scores the Net Worth trend negatively when net worth declined since the comparison snapshot", () => {
    const result = computeConfidenceScore(
      makeInputs({ netWorth: makeNetWorthOverview({ hasHistory: true, netWorthChange: makeChange("2026-07-01", -1000, -20) }) }),
    );
    const signal = result.pillars.find((p) => p.id === "progressTrajectory")!.signals.find((s) => s.id === "progress.net-worth-trend")!;
    expect(signal.polarity).toBe("negative");
    expect(signal.reasonCode).toBe("NET_WORTH_DECLINING");
  });

  it("computes goal completion rate from real goal health, excluding archived goals", () => {
    const result = computeConfidenceScore(
      makeInputs({
        goalProgressList: [
          makeGoalProgress(makeGoal("general-savings", "completed"), 100, "completed"),
          makeGoalProgress(makeGoal("vacation", "active"), 50, "on-track"),
          makeGoalProgress(makeGoal("vacation", "active"), 10, "behind"),
          makeGoalProgress(makeGoal("vacation", "archived"), 0, "behind"),
        ],
      }),
    );
    const signal = result.pillars
      .find((p) => p.id === "progressTrajectory")!
      .signals.find((s) => s.id === "progress.goal-completion-rate")!;
    // 2 of 3 non-archived goals are completed/on-track.
    expect(signal.score).toBeCloseTo((2 / 3) * 100, 10);
  });
});

describe("Investing / Retirement — holdings without penalizing absence as missing data", () => {
  it("is unavailable (not a real 0) for a brand-new owner with zero accounts of any kind — nothing to judge yet", () => {
    const result = computeConfidenceScore(makeInputs());
    const investing = result.pillars.find((p) => p.id === "investing")!.signals.find((s) => s.id === "investing.holdings-trend")!;
    expect(investing.status).toBe("unavailable");
    expect(investing.reasonCode).toBe("NO_ACCOUNTS_AT_ALL");
  });

  it("scores zero (a real signal, not unavailable) when the owner has other accounts but none of this specific type", () => {
    const result = computeConfidenceScore(makeInputs({ activeAccounts: [makeAccount("checking", "1000.00")] }));
    const investing = result.pillars.find((p) => p.id === "investing")!.signals.find((s) => s.id === "investing.holdings-trend")!;
    expect(investing.status).toBe("available");
    expect(investing.score).toBe(0);
    expect(investing.reasonCode).toBe("NO_ACCOUNTS_OF_TYPE");
  });

  it("gives partial credit for holding accounts even with no trend history yet", () => {
    const result = computeConfidenceScore(makeInputs({ activeAccounts: [makeAccount("retirement", "5000.00")] }));
    const signal = result.pillars.find((p) => p.id === "retirement")!.signals.find((s) => s.id === "retirement.holdings-trend")!;
    expect(signal.score).toBe(60);
    expect(signal.reasonCode).toBe("HOLDINGS_PRESENT_NO_TREND_YET");
  });

  it("scores the holdings trend from real category balance changes once history exists", () => {
    const result = computeConfidenceScore(
      makeInputs({
        activeAccounts: [makeAccount("investment", "11000.00")],
        netWorth: makeNetWorthOverview({ hasHistory: true, assetCategoryChanges: [makeCategoryChange("investment", 11000, 10000)] }),
      }),
    );
    const signal = result.pillars.find((p) => p.id === "investing")!.signals.find((s) => s.id === "investing.holdings-trend")!;
    expect(signal.polarity).toBe("positive");
    expect(signal.reasonCode).toBe("BALANCE_GROWING");
  });
});
