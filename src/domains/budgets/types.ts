import type {
  BudgetAllocation,
  BudgetAllocationAdjustment,
  BudgetPeriod,
  BudgetPeriodStatus,
  NewBudgetAllocation,
  NewBudgetAllocationAdjustment,
  NewBudgetPeriod,
} from "@/db/schema/budgets";

export type { BudgetAllocation, BudgetAllocationAdjustment, BudgetPeriod, BudgetPeriodStatus };

export type BudgetPeriodCreateInput = Omit<NewBudgetPeriod, "id" | "status" | "createdAt" | "updatedAt" | "deletedAt">;

// status is intentionally the only mutable field a caller may set through
// this type — see budgets.ts's schema comment: period_start/period_end are
// immutable once a period exists.
export type BudgetPeriodStatusUpdateInput = { status: BudgetPeriodStatus };

export type BudgetAllocationCreateInput = Omit<
  NewBudgetAllocation,
  "id" | "displayOrder" | "createdAt" | "updatedAt" | "deletedAt"
>;

export type BudgetAllocationUpdateInput = Partial<
  Pick<NewBudgetAllocation, "plannedAmount" | "displayOrder">
>;

export type BudgetAllocationAdjustmentCreateInput = Omit<NewBudgetAllocationAdjustment, "id" | "createdAt">;

export interface BudgetAllocationListFilter {
  budgetPeriodId?: string;
}
