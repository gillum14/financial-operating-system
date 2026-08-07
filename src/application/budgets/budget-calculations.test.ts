import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import type { BudgetAllocation } from "@/domains/budgets/types";
import type { Category } from "@/domains/categories/types";

import { computeAllocationSummaries, computeBudgetPeriodTotals } from "./budget-calculations";

const ownerId = randomUUID();
const budgetPeriodId = randomUUID();

function makeCategory(id: string, name: string, overrides: Partial<Category> = {}): Category {
  return {
    id,
    ownerId,
    name,
    parentCategoryId: null,
    color: null,
    description: null,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

function makeAllocation(categoryId: string, plannedAmount: string, displayOrder = 0): BudgetAllocation {
  return {
    id: randomUUID(),
    ownerId,
    budgetPeriodId,
    categoryId,
    plannedAmount,
    displayOrder,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };
}

describe("computeAllocationSummaries", () => {
  it("standard spending: remaining and variance are Planned - Actual", () => {
    const groceriesId = randomUUID();
    const categoriesById = new Map([[groceriesId, makeCategory(groceriesId, "Groceries")]]);
    const allocations = [makeAllocation(groceriesId, "500.00")];
    const actualSpend = new Map([[groceriesId, 300]]);

    const [summary] = computeAllocationSummaries(allocations, actualSpend, categoriesById);

    expect(summary.planned).toBe(500);
    expect(summary.actual).toBe(300);
    expect(summary.remaining).toBe(200);
    expect(summary.variance).toBe(200);
    expect(summary.utilization).toBe(60);
    expect(summary.overspending).toBe(false);
  });

  it("overspending: actual > planned flips overspending true and remaining negative", () => {
    const diningId = randomUUID();
    const categoriesById = new Map([[diningId, makeCategory(diningId, "Dining")]]);
    const allocations = [makeAllocation(diningId, "100.00")];
    const actualSpend = new Map([[diningId, 150]]);

    const [summary] = computeAllocationSummaries(allocations, actualSpend, categoriesById);

    expect(summary.remaining).toBe(-50);
    expect(summary.utilization).toBe(150);
    expect(summary.overspending).toBe(true);
  });

  it("actual exactly equal to planned is not overspending (boundary)", () => {
    const gymId = randomUUID();
    const categoriesById = new Map([[gymId, makeCategory(gymId, "Gym")]]);
    const allocations = [makeAllocation(gymId, "45.00")];
    const actualSpend = new Map([[gymId, 45]]);

    const [summary] = computeAllocationSummaries(allocations, actualSpend, categoriesById);

    expect(summary.remaining).toBe(0);
    expect(summary.overspending).toBe(false);
  });

  it("no spending: an allocation with no matching entry in actualSpendByCategoryId is $0 actual, not unknown", () => {
    const savingsId = randomUUID();
    const categoriesById = new Map([[savingsId, makeCategory(savingsId, "Savings Contributions")]]);
    const allocations = [makeAllocation(savingsId, "300.00")];
    const actualSpend = new Map<string, number>(); // empty — no transactions at all

    const [summary] = computeAllocationSummaries(allocations, actualSpend, categoriesById);

    expect(summary.actual).toBe(0);
    expect(summary.remaining).toBe(300);
    expect(summary.utilization).toBe(0);
    expect(summary.overspending).toBe(false);
  });

  it("refunds: a net-negative actual (refund exceeds spend in the category) still computes correctly", () => {
    const electronicsId = randomUUID();
    const categoriesById = new Map([[electronicsId, makeCategory(electronicsId, "Electronics")]]);
    const allocations = [makeAllocation(electronicsId, "150.00")];
    // computeCategorySpendForPeriod nets income against expense per
    // category — a refund-only month (no matching purchase) produces a
    // negative "actual", exactly what's asserted here.
    const actualSpend = new Map([[electronicsId, -111.52]]);

    const [summary] = computeAllocationSummaries(allocations, actualSpend, categoriesById);

    expect(summary.actual).toBe(-111.52);
    expect(summary.remaining).toBeCloseTo(261.52, 2);
    expect(summary.overspending).toBe(false);
  });

  it("zero planned: utilization is null, not Infinity or a divide-by-zero artifact", () => {
    const miscId = randomUUID();
    const categoriesById = new Map([[miscId, makeCategory(miscId, "Misc")]]);
    const allocations = [makeAllocation(miscId, "0.00")];
    const actualSpend = new Map([[miscId, 25]]);

    const [summary] = computeAllocationSummaries(allocations, actualSpend, categoriesById);

    expect(summary.utilization).toBeNull();
    // Still correctly flagged overspent — $0 planned, $25 spent.
    expect(summary.overspending).toBe(true);
  });

  it("empty budget: no allocations produces an empty (not fabricated) summary list", () => {
    const summaries = computeAllocationSummaries([], new Map(), new Map());
    expect(summaries).toEqual([]);
  });

  it("falls back to a placeholder name when a category is missing from the lookup map", () => {
    const orphanId = randomUUID();
    const allocations = [makeAllocation(orphanId, "50.00")];

    const [summary] = computeAllocationSummaries(allocations, new Map(), new Map());

    expect(summary.categoryName).toBe("Unknown Category");
  });
});

describe("computeBudgetPeriodTotals", () => {
  it("sums planned/actual across every allocation and derives remaining + overall progress", () => {
    const catA = randomUUID();
    const catB = randomUUID();
    const categoriesById = new Map([
      [catA, makeCategory(catA, "A")],
      [catB, makeCategory(catB, "B")],
    ]);
    const allocations = [makeAllocation(catA, "500.00", 0), makeAllocation(catB, "200.00", 1)];
    const actualSpend = new Map([
      [catA, 300],
      [catB, 250],
    ]);
    const summaries = computeAllocationSummaries(allocations, actualSpend, categoriesById);

    const totals = computeBudgetPeriodTotals(summaries);

    expect(totals.totalBudgeted).toBe(700);
    expect(totals.totalSpent).toBe(550);
    expect(totals.totalRemaining).toBe(150);
    expect(totals.overallProgress).toBeCloseTo((550 / 700) * 100, 5);
  });

  it("empty budget: all totals are honestly zero, overallProgress is 0 not NaN", () => {
    const totals = computeBudgetPeriodTotals([]);

    expect(totals).toEqual({ totalBudgeted: 0, totalSpent: 0, totalRemaining: 0, overallProgress: 0 });
  });
});
