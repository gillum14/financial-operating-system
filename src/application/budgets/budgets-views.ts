import type { BudgetPeriodStatus } from "@/domains/budgets/types";

// Presentation-shaped view model for the Budgets workspace, kept outside
// src/composition/ (server-only) so "use client" components can import
// this *type* without pulling in a composition-root module — same pattern
// as src/application/transactions/transactions-views.ts and
// src/application/accounts/accounts-views.ts.
//
// hasBudget discriminates the two honest states: no active/selectable
// period exists for this owner yet (every field below undefined — never
// fabricated zeros), or a real period with real, Transaction-derived
// numbers. This is a non-breaking extension of the original stub's shape
// (same field name/meaning), per its own comment: "swapping the body for
// a real query later won't change this function's signature."

export interface BudgetCategoryRow {
  allocationId: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string | null;
  planned: number;
  actual: number;
  remaining: number;
  // null when planned is 0 — see budget-calculations.ts.
  utilization: number | null;
  overspending: boolean;
}

export interface BudgetAdjustmentRow {
  id: string;
  categoryName: string;
  previousAmount: number;
  newAmount: number;
  // Pre-formatted server-side (e.g. "Aug 4, 2026"), matching every other
  // page's convention of never formatting dates in a "use client"
  // component.
  changedAtLabel: string;
}

export interface BudgetPeriodOption {
  id: string;
  label: string;
  status: BudgetPeriodStatus;
}

export interface BudgetsOverviewView {
  hasBudget: boolean;
  period?: {
    id: string;
    label: string;
    status: BudgetPeriodStatus;
    periodStart: string;
    periodEnd: string;
    // Only a Draft or Active period's allocations may be edited — see
    // BudgetService's EDITABLE_STATUSES. The UI never has to re-derive
    // this from status itself.
    isEditable: boolean;
  };
  // Every period this owner has (any status) for the period-selector
  // dropdown — includes the one currently shown in `period`.
  availablePeriods?: BudgetPeriodOption[];
  metrics?: {
    totalBudgeted: number;
    totalSpent: number;
    totalRemaining: number;
    overallProgress: number;
  };
  categories?: BudgetCategoryRow[];
  onTrack?: {
    onTrackCount: number;
    overspentCount: number;
    totalCount: number;
  };
  recentAdjustments?: BudgetAdjustmentRow[];
  // Category ids already allocated in the shown period — the "Add
  // Category" picker excludes these (a category can only be allocated
  // once per period, enforced by BudgetService too; the UI reflects the
  // same rule instead of letting a user submit a request that's certain
  // to fail).
  allocatableCategories?: { id: string; name: string; parentCategoryId: string | null }[];
}
