import "server-only";

import type {
  BudgetAdjustmentRow,
  BudgetCategoryRow,
  BudgetPeriodOption,
  BudgetsOverviewView,
} from "@/application/budgets/budgets-views";

import { getBudgetService } from "./budgets-composition";
import { getCategoryService } from "./categories-composition";

export type { BudgetsOverviewView };

function formatPeriodLabel(periodStart: string): string {
  return new Date(`${periodStart}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatDateLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

// Same role as dashboard-query.ts / accounts-query.ts: combine
// BudgetService reads into a presentation-ready view model. No JSX, no
// try/catch — errors propagate to the route's error boundary.
//
// selectedPeriodId lets the period-selector dropdown ask for a specific
// (e.g. historical) period; omitted, this shows the owner's active period,
// falling back to the most recent period of any status if none is active
// (still real data, just not "the current" one) — never an arbitrary or
// fabricated choice.
export async function getBudgetsOverview(ownerId: string, selectedPeriodId?: string): Promise<BudgetsOverviewView> {
  const budgetService = getBudgetService();
  const periods = await budgetService.listBudgetPeriods(ownerId);
  if (periods.length === 0) {
    return { hasBudget: false };
  }

  const availablePeriods: BudgetPeriodOption[] = periods.map((period) => ({
    id: period.id,
    label: formatPeriodLabel(period.periodStart),
    status: period.status,
  }));

  // periods is already ordered newest-first (BudgetPeriodRepository.
  // listForOwner orders by periodStart desc), so periods[0] is "the most
  // recent" when nothing is active.
  const selected = selectedPeriodId
    ? periods.find((period) => period.id === selectedPeriodId)
    : (periods.find((period) => period.status === "active") ?? periods[0]);

  if (!selected) {
    return { hasBudget: false };
  }

  const summary = await budgetService.getBudgetPeriodSummary(ownerId, selected.id);
  if (!summary) {
    return { hasBudget: false };
  }

  const categories: BudgetCategoryRow[] = summary.allocations.map((item) => ({
    allocationId: item.allocation.id,
    categoryId: item.allocation.categoryId,
    categoryName: item.categoryName,
    categoryColor: item.categoryColor,
    planned: item.planned,
    actual: item.actual,
    remaining: item.remaining,
    utilization: item.utilization,
    overspending: item.overspending,
  }));

  const categoryNameByAllocationId = new Map(
    summary.allocations.map((item) => [item.allocation.id, item.categoryName]),
  );
  const recentAdjustments: BudgetAdjustmentRow[] = summary.recentAdjustments.map((adjustment) => ({
    id: adjustment.id,
    categoryName: categoryNameByAllocationId.get(adjustment.budgetAllocationId) ?? "Unknown Category",
    previousAmount: Number(adjustment.previousAmount),
    newAmount: Number(adjustment.newAmount),
    changedAtLabel: formatDateLabel(adjustment.createdAt),
  }));

  const allCategories = await getCategoryService().listCategories(ownerId);
  const allocatedCategoryIds = new Set(summary.allocations.map((item) => item.allocation.categoryId));
  const allocatableCategories = allCategories
    .filter((category) => !allocatedCategoryIds.has(category.id))
    .map((category) => ({ id: category.id, name: category.name, parentCategoryId: category.parentCategoryId }));

  return {
    hasBudget: true,
    period: {
      id: summary.period.id,
      label: formatPeriodLabel(summary.period.periodStart),
      status: summary.period.status,
      periodStart: summary.period.periodStart,
      periodEnd: summary.period.periodEnd,
      isEditable: summary.period.status === "draft" || summary.period.status === "active",
    },
    availablePeriods,
    metrics: {
      totalBudgeted: summary.totals.totalBudgeted,
      totalSpent: summary.totals.totalSpent,
      totalRemaining: summary.totals.totalRemaining,
      overallProgress: summary.totals.overallProgress,
    },
    categories,
    onTrack: {
      onTrackCount: categories.filter((row) => !row.overspending).length,
      overspentCount: categories.filter((row) => row.overspending).length,
      totalCount: categories.length,
    },
    recentAdjustments,
    allocatableCategories,
  };
}
