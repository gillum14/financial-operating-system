import type { BudgetAllocation } from "@/domains/budgets/types";
import type { Category } from "@/domains/categories/types";

// Pure calculation layer — the "Budget Calculation Service" named in
// docs/architecture/domain-model.md's Domain Service Boundaries, kept as
// standalone functions (not methods) the same way
// spending-aggregation.ts's computeSpendingSummary/computeCategoryBreakdown
// are: no repository/DB dependency, trivially unit-testable with plain
// fixtures, and the only place any of these formulas is defined —
// budgets-model.md §13 Budget Calculations, reproduced exactly:
//   Remaining = Planned − Actual
//   Variance = Planned − Actual   (same formula as Remaining — the model
//     names them separately, so both are exposed as distinct fields even
//     though they are numerically identical; callers should not assume
//     that will always remain true if the model ever changes)
//   Utilization = Actual ÷ Planned × 100
//   Overspending = Actual > Planned

export interface BudgetAllocationSummary {
  allocation: BudgetAllocation;
  categoryName: string;
  categoryColor: string | null;
  planned: number;
  actual: number;
  remaining: number;
  variance: number;
  // null when planned is 0 — "percent of zero" is undefined, not 0 or
  // Infinity; render as "—" / "No budget allocated" rather than dividing
  // by zero. Overspending is still computed correctly in this case
  // (actual > 0 = planned means overspending is true) independent of
  // utilization being null.
  utilization: number | null;
  overspending: boolean;
}

export interface BudgetPeriodTotals {
  totalBudgeted: number;
  totalSpent: number;
  totalRemaining: number;
  // 0-100, clamped implicitly by construction (never negative since
  // amounts are non-negative; can exceed 100 when overspent overall,
  // which callers should clamp for display purposes only — the
  // underlying number is the honest, unclamped value).
  overallProgress: number;
}

// actualSpendByCategoryId: from
// spending-aggregation.ts's computeCategorySpendForPeriod, keyed by exact
// categoryId — an allocation with no matching entry has genuinely spent
// $0 in that category during the period, not an unknown amount.
export function computeAllocationSummaries(
  allocations: BudgetAllocation[],
  actualSpendByCategoryId: Map<string, number>,
  categoriesById: Map<string, Category>,
): BudgetAllocationSummary[] {
  return allocations.map((allocation) => {
    const planned = Number(allocation.plannedAmount);
    const actual = actualSpendByCategoryId.get(allocation.categoryId) ?? 0;
    const category = categoriesById.get(allocation.categoryId);

    return {
      allocation,
      categoryName: category?.name ?? "Unknown Category",
      categoryColor: category?.color ?? null,
      planned,
      actual,
      remaining: planned - actual,
      variance: planned - actual,
      utilization: planned > 0 ? (actual / planned) * 100 : null,
      overspending: actual > planned,
    };
  });
}

export function computeBudgetPeriodTotals(summaries: BudgetAllocationSummary[]): BudgetPeriodTotals {
  const totalBudgeted = summaries.reduce((sum, item) => sum + item.planned, 0);
  const totalSpent = summaries.reduce((sum, item) => sum + item.actual, 0);

  return {
    totalBudgeted,
    totalSpent,
    totalRemaining: totalBudgeted - totalSpent,
    overallProgress: totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0,
  };
}
