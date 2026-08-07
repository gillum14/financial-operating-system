import type {
  BudgetAllocation,
  BudgetAllocationAdjustment,
  BudgetAllocationAdjustmentCreateInput,
  BudgetAllocationCreateInput,
  BudgetAllocationListFilter,
  BudgetAllocationUpdateInput,
  BudgetPeriod,
  BudgetPeriodCreateInput,
  BudgetPeriodStatusUpdateInput,
} from "./types";

export interface BudgetPeriodRepository {
  getByIdForOwner(id: string, ownerId: string): Promise<BudgetPeriod | null>;
  listForOwner(ownerId: string): Promise<BudgetPeriod[]>;
  // The single period currently in "active" status for this owner, or null
  // if none — relies on the DB's own one-active-per-owner partial unique
  // index (budget_periods_one_active_per_owner_idx) to guarantee at most
  // one row could ever match.
  getActiveForOwner(ownerId: string): Promise<BudgetPeriod | null>;
  create(input: BudgetPeriodCreateInput): Promise<BudgetPeriod>;
  updateStatus(id: string, ownerId: string, changes: BudgetPeriodStatusUpdateInput): Promise<BudgetPeriod>;
}

export interface BudgetAllocationRepository {
  getByIdForOwner(id: string, ownerId: string): Promise<BudgetAllocation | null>;
  listForOwner(ownerId: string, filter?: BudgetAllocationListFilter): Promise<BudgetAllocation[]>;
  create(input: BudgetAllocationCreateInput & { displayOrder: number }): Promise<BudgetAllocation>;
  update(id: string, ownerId: string, changes: BudgetAllocationUpdateInput): Promise<BudgetAllocation>;
  softDelete(id: string, ownerId: string): Promise<void>;
}

export interface BudgetAllocationAdjustmentRepository {
  // Every adjustment across the given allocations, newest first — one
  // query rather than one-per-allocation, since the natural caller
  // (a period's "recent adjustments" view) already knows the full set of
  // allocation ids it cares about up front.
  listForOwnerAndAllocations(ownerId: string, budgetAllocationIds: string[]): Promise<BudgetAllocationAdjustment[]>;
  create(input: BudgetAllocationAdjustmentCreateInput): Promise<BudgetAllocationAdjustment>;
}
