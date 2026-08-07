import type {
  Goal,
  GoalAllocation,
  GoalAllocationCreateInput,
  GoalAllocationUpdateInput,
  GoalContribution,
  GoalContributionCreateInput,
  GoalContributionUpdateInput,
  GoalCreateInput,
  GoalStatusUpdateInput,
  GoalUpdateInput,
} from "./types";

export interface GoalRepository {
  getByIdForOwner(id: string, ownerId: string): Promise<Goal | null>;
  listForOwner(ownerId: string): Promise<Goal[]>;
  create(input: GoalCreateInput & { displayOrder: number }): Promise<Goal>;
  update(id: string, ownerId: string, changes: GoalUpdateInput): Promise<Goal>;
  updateStatus(id: string, ownerId: string, changes: GoalStatusUpdateInput): Promise<Goal>;
  softDelete(id: string, ownerId: string): Promise<void>;
}

export interface GoalContributionRepository {
  getByIdForOwner(id: string, ownerId: string): Promise<GoalContribution | null>;
  // Every contribution across the given goals, newest first — one batched
  // query rather than one-per-goal, mirroring
  // BudgetAllocationAdjustmentRepository.listForOwnerAndAllocations.
  listForOwnerAndGoals(ownerId: string, goalIds: string[]): Promise<GoalContribution[]>;
  create(input: GoalContributionCreateInput): Promise<GoalContribution>;
  update(id: string, ownerId: string, changes: GoalContributionUpdateInput): Promise<GoalContribution>;
  softDelete(id: string, ownerId: string): Promise<void>;
}

export interface GoalAllocationRepository {
  getByIdForOwner(id: string, ownerId: string): Promise<GoalAllocation | null>;
  // Every active allocation across the given goals — the per-goal half of
  // "funding sources for this goal" / allocatedAmount.
  listForOwnerAndGoals(ownerId: string, goalIds: string[]): Promise<GoalAllocation[]>;
  // Every active allocation across the given accounts, regardless of which
  // goal — the per-account half of "how much of this account is already
  // spoken for" (unallocated balance, overallocation checks). Batched the
  // same way listForOwnerAndGoals is, for the same reason.
  listForOwnerAndAccounts(ownerId: string, accountIds: string[]): Promise<GoalAllocation[]>;
  // Overallocation prevention (ADR-0003 "One Dollar May Only Be Allocated
  // Once") is enforced authoritatively by the goal_allocations_no_
  // overallocation trigger (see the migration) — create/update here throw
  // ConflictError when that trigger rejects the write, translating the
  // raw Postgres exception into this codebase's normal domain-error type.
  create(input: GoalAllocationCreateInput): Promise<GoalAllocation>;
  update(id: string, ownerId: string, changes: GoalAllocationUpdateInput): Promise<GoalAllocation>;
  softDelete(id: string, ownerId: string): Promise<void>;
}
