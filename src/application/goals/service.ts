import { z } from "zod";

import type { AccountRepository } from "@/domains/accounts/repository";
import type { AccountType } from "@/domains/accounts/types";
import type { CategoryRepository } from "@/domains/categories/repository";
import { ConflictError, NotFoundError, ValidationError } from "@/domains/errors";
import type { GoalAllocationRepository, GoalContributionRepository, GoalRepository } from "@/domains/goals/repository";
import { GOAL_PRIORITIES, GOAL_TYPES } from "@/db/schema/goals";
import type { Goal, GoalAllocation, GoalContribution, GoalPriority, GoalStatus } from "@/domains/goals/types";

import { computeAccountAllocationSummary, computeGoalProgress, type GoalProgress } from "./goal-calculations";

// Archived is the only frozen state — an active, paused, or completed goal
// may still be edited (goals-specification.md §10: "completed goals may
// continue receiving contributions if enabled"; a paused goal is expected
// to resume, so renaming it or adjusting its target while paused is a
// normal workflow, not a frozen one). Archiving is a deliberate "put away"
// action, mirroring EDITABLE_STATUSES in budgets/service.ts.
const EDITABLE_STATUSES = new Set<GoalStatus>(["active", "paused", "completed"]);

// Statuses that accept new funding (contributions/allocations) — Paused
// and Archived both refuse *new* funding, but for different reasons:
// Archived is permanently put away, Paused is a deliberate "don't add to
// this right now" pause that's expected to resume. Existing contributions/
// allocations on a paused or archived goal are never touched — only new
// additions are refused.
const FUNDABLE_STATUSES = new Set<GoalStatus>(["active", "completed"]);

// ADR-0003's eligible funding sources: "savings accounts, checking/cash
// accounts where appropriate, CDs, investment accounts, retirement
// accounts where appropriate, other eligible asset accounts." CDs have no
// dedicated AccountType in this codebase — they are seeded as
// accountType: "other-asset" (see fixtures/accounts.ts), which this set
// already covers. Liability types (credit-card, mortgage, personal-loan,
// vehicle-loan, other-liability) are never eligible — a negative-balance
// liability cannot fund a goal. "property" is deliberately excluded too:
// it is an illiquid, non-cash asset with no "available balance" in the
// sense goal allocation requires (accessing it would mean a HELOC or a
// sale, neither of which this codebase models); a genuine liquidity/asset-
// type distinction, not an oversight.
export const ELIGIBLE_ALLOCATION_ACCOUNT_TYPES = new Set<AccountType>([
  "checking",
  "savings",
  "cash",
  "investment",
  "retirement",
  "other-asset",
]);

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a YYYY-MM-DD date");

const createGoalSchema = z.object({
  ownerId: z.string().uuid(),
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().trim().optional(),
  targetAmount: z.number().positive().finite(),
  targetDate: dateStringSchema.optional(),
  goalType: z.enum(GOAL_TYPES),
  priority: z.enum(GOAL_PRIORITIES).optional(),
  icon: z.string().trim().optional(),
  color: z.string().trim().optional(),
  categoryId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(),
});

const updateGoalSchema = z.object({
  title: z.string().trim().min(1).optional(),
  description: z.string().trim().optional(),
  targetAmount: z.number().positive().finite().optional(),
  targetDate: dateStringSchema.optional(),
  goalType: z.enum(GOAL_TYPES).optional(),
  priority: z.enum(GOAL_PRIORITIES).optional(),
  icon: z.string().trim().optional(),
  color: z.string().trim().optional(),
  categoryId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(),
});

const addContributionSchema = z.object({
  ownerId: z.string().uuid(),
  goalId: z.string().uuid(),
  amount: z.number().positive().finite(),
  contributionDate: dateStringSchema,
  note: z.string().trim().optional(),
});

const updateContributionSchema = z.object({
  amount: z.number().positive().finite().optional(),
  contributionDate: dateStringSchema.optional(),
  note: z.string().trim().optional(),
});

const allocateFundsSchema = z.object({
  ownerId: z.string().uuid(),
  goalId: z.string().uuid(),
  accountId: z.string().uuid(),
  amount: z.number().positive().finite(),
});

const updateAllocationSchema = z.object({
  amount: z.number().positive().finite(),
});

export class GoalService {
  constructor(
    private readonly goalRepository: GoalRepository,
    private readonly goalContributionRepository: GoalContributionRepository,
    private readonly goalAllocationRepository: GoalAllocationRepository,
    private readonly categoryRepository: CategoryRepository,
    private readonly accountRepository: AccountRepository,
  ) {}

  // ---- Goal lifecycle ------------------------------------------------

  async createGoal(input: {
    ownerId: string;
    title: string;
    description?: string;
    targetAmount: number;
    targetDate?: string;
    goalType: (typeof GOAL_TYPES)[number];
    priority?: GoalPriority;
    icon?: string;
    color?: string;
    categoryId?: string;
    accountId?: string;
  }): Promise<Goal> {
    const parsed = createGoalSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.message);
    }

    // goals-specification.md §10: "Target dates cannot precede creation."
    if (parsed.data.targetDate && parsed.data.targetDate < todayDateString()) {
      throw new ValidationError("targetDate cannot be in the past");
    }

    if (parsed.data.categoryId) {
      await this.assertOwnedCategory(parsed.data.categoryId, parsed.data.ownerId);
    }
    if (parsed.data.accountId) {
      await this.assertOwnedAccount(parsed.data.accountId, parsed.data.ownerId);
    }

    const siblings = await this.goalRepository.listForOwner(parsed.data.ownerId);
    const displayOrder = siblings.length === 0 ? 0 : Math.max(...siblings.map((goal) => goal.displayOrder)) + 1;

    return this.goalRepository.create({
      ownerId: parsed.data.ownerId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      targetAmount: parsed.data.targetAmount.toFixed(2),
      targetDate: parsed.data.targetDate ?? null,
      goalType: parsed.data.goalType,
      // Defaulted explicitly here rather than relying solely on the
      // column default — keeps the fake in-memory repository (used by
      // unit tests) behaviorally identical to the real one without having
      // to replicate Postgres column defaults.
      priority: parsed.data.priority ?? "medium",
      icon: parsed.data.icon ?? null,
      color: parsed.data.color ?? null,
      categoryId: parsed.data.categoryId ?? null,
      accountId: parsed.data.accountId ?? null,
      displayOrder,
    });
  }

  async listGoals(ownerId: string): Promise<Goal[]> {
    return this.goalRepository.listForOwner(ownerId);
  }

  async getGoal(id: string, ownerId: string): Promise<Goal | null> {
    return this.goalRepository.getByIdForOwner(id, ownerId);
  }

  async updateGoal(
    id: string,
    ownerId: string,
    changes: {
      title?: string;
      description?: string;
      targetAmount?: number;
      targetDate?: string;
      goalType?: (typeof GOAL_TYPES)[number];
      priority?: GoalPriority;
      icon?: string;
      color?: string;
      categoryId?: string;
      accountId?: string;
    },
  ): Promise<Goal> {
    const parsed = updateGoalSchema.safeParse(changes);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.message);
    }

    const goal = await this.requireOwnedGoal(id, ownerId);
    this.assertGoalEditable(goal);

    if (parsed.data.categoryId) {
      await this.assertOwnedCategory(parsed.data.categoryId, ownerId);
    }
    if (parsed.data.accountId) {
      await this.assertOwnedAccount(parsed.data.accountId, ownerId);
    }

    return this.goalRepository.update(id, ownerId, {
      ...parsed.data,
      targetAmount: parsed.data.targetAmount?.toFixed(2),
    });
  }

  // Active -> Completed only, guarded by currentAmount >= targetAmount
  // (goals-model.md §13 Goal Completion: "Allocated Amount ≥ Target
  // Amount") — an explicit user action, never triggered automatically by a
  // contribution or allocation reaching the target. currentAmount here is
  // the same allocatedAmount + manualContributionsAmount total everywhere
  // else in this service — a goal funded entirely by allocations, entirely
  // by manual contributions, or a mix of both, completes the same way.
  async completeGoal(id: string, ownerId: string): Promise<Goal> {
    const goal = await this.requireOwnedGoal(id, ownerId);
    if (goal.status !== "active") {
      throw new ConflictError(`Goal ${id} must be active to complete (current: ${goal.status})`);
    }

    const progress = await this.getGoalProgress(id, ownerId);
    if (!progress || progress.currentAmount < progress.targetAmount) {
      throw new ConflictError(`Goal ${id} has not reached its target amount yet`);
    }

    return this.goalRepository.updateStatus(id, ownerId, { status: "completed", completedAt: new Date() });
  }

  // Active, Paused, or Completed -> Archived. Never deletes the row — no
  // DELETE grant exists on goals at any layer, matching every other owned
  // table. Existing allocations/contributions against an archived goal are
  // left untouched (archiving "hides," it never retroactively unwinds
  // funding); only new allocations/contributions are refused (see
  // allocateFunds/addContribution below).
  async archiveGoal(id: string, ownerId: string): Promise<Goal> {
    const goal = await this.requireOwnedGoal(id, ownerId);
    if (goal.status === "archived") {
      throw new ConflictError(`Goal ${id} is already archived`);
    }

    return this.goalRepository.updateStatus(id, ownerId, { status: "archived" });
  }

  // Active -> Paused only — a deliberate "stop funding this for now"
  // action, distinct from Archived ("put this away"). All existing
  // allocations and contributions are left exactly as they are; a paused
  // goal simply stops accepting *new* ones (see FUNDABLE_STATUSES) and is
  // excluded from active-goal summary metrics (see goals-query.ts) until
  // resumed.
  async pauseGoal(id: string, ownerId: string): Promise<Goal> {
    const goal = await this.requireOwnedGoal(id, ownerId);
    if (goal.status !== "active") {
      throw new ConflictError(`Goal ${id} must be active to pause (current: ${goal.status})`);
    }

    return this.goalRepository.updateStatus(id, ownerId, { status: "paused" });
  }

  // Paused -> Active only, the inverse of pauseGoal.
  async resumeGoal(id: string, ownerId: string): Promise<Goal> {
    const goal = await this.requireOwnedGoal(id, ownerId);
    if (goal.status !== "paused") {
      throw new ConflictError(`Goal ${id} must be paused to resume (current: ${goal.status})`);
    }

    return this.goalRepository.updateStatus(id, ownerId, { status: "active" });
  }

  // ---- Manual Contributions --------------------------------------------

  async addContribution(input: {
    ownerId: string;
    goalId: string;
    amount: number;
    contributionDate: string;
    note?: string;
  }): Promise<GoalContribution> {
    const parsed = addContributionSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.message);
    }

    const goal = await this.requireOwnedGoal(parsed.data.goalId, parsed.data.ownerId);
    // goals-specification.md §10: "Archived goals cannot receive new
    // contributions." Active and Completed goals both may (the latter
    // matches "completed goals may continue receiving contributions if
    // enabled"); Paused goals may not, until resumed (see
    // FUNDABLE_STATUSES).
    if (!FUNDABLE_STATUSES.has(goal.status)) {
      throw new ConflictError(`Goal ${goal.id} is ${goal.status} and cannot receive new contributions`);
    }

    return this.goalContributionRepository.create({
      ownerId: parsed.data.ownerId,
      goalId: parsed.data.goalId,
      amount: parsed.data.amount.toFixed(2),
      contributionDate: parsed.data.contributionDate,
      note: parsed.data.note ?? null,
      source: "manual",
    });
  }

  async updateContribution(
    id: string,
    ownerId: string,
    changes: { amount?: number; contributionDate?: string; note?: string },
  ): Promise<GoalContribution> {
    const parsed = updateContributionSchema.safeParse(changes);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.message);
    }

    await this.requireOwnedContribution(id, ownerId);

    return this.goalContributionRepository.update(id, ownerId, {
      ...parsed.data,
      amount: parsed.data.amount?.toFixed(2),
    });
  }

  async removeContribution(id: string, ownerId: string): Promise<void> {
    await this.requireOwnedContribution(id, ownerId);
    await this.goalContributionRepository.softDelete(id, ownerId);
  }

  // ---- Goal Allocations (ADR-0003 Goal Allocation Model) ----------------
  //
  // "One Dollar May Only Be Allocated Once" / "Overallocation Is
  // Prohibited": every method below checks
  //   sum(other active allocations for this account) + amount <= account.currentBalance
  // proactively, for a friendly ConflictError in the common (sequential)
  // case. This is deliberately NOT the only enforcement — two concurrent
  // requests can both pass this check before either commits, which is
  // exactly what the goal_allocations_no_overallocation database trigger
  // (see the migration) exists to close: it re-runs the same check inside
  // the write transaction itself, after taking a row lock on the account,
  // so the second writer sees the first's row and is correctly rejected.
  // DrizzleGoalAllocationRepository translates that trigger's exception
  // into the same ConflictError this proactive check throws, so callers
  // never have to distinguish which layer caught it.

  async allocateFunds(input: { ownerId: string; goalId: string; accountId: string; amount: number }): Promise<GoalAllocation> {
    const parsed = allocateFundsSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.message);
    }

    const goal = await this.requireOwnedGoal(parsed.data.goalId, parsed.data.ownerId);
    if (!FUNDABLE_STATUSES.has(goal.status)) {
      throw new ConflictError(`Goal ${goal.id} is ${goal.status} and cannot receive new allocations`);
    }

    const account = await this.requireEligibleFundingAccount(parsed.data.accountId, parsed.data.ownerId);

    const siblingGoalAllocations = await this.goalAllocationRepository.listForOwnerAndGoals(parsed.data.ownerId, [
      parsed.data.goalId,
    ]);
    if (siblingGoalAllocations.some((allocation) => allocation.accountId === parsed.data.accountId)) {
      throw new ConflictError(
        `Account ${parsed.data.accountId} is already allocated to this goal — edit the existing allocation instead`,
      );
    }

    await this.assertWithinAvailableBalance(parsed.data.ownerId, account, parsed.data.amount);

    return this.goalAllocationRepository.create({
      ownerId: parsed.data.ownerId,
      goalId: parsed.data.goalId,
      accountId: parsed.data.accountId,
      amount: parsed.data.amount.toFixed(2),
    });
  }

  async editAllocation(id: string, ownerId: string, amount: number): Promise<GoalAllocation> {
    const parsed = updateAllocationSchema.safeParse({ amount });
    if (!parsed.success) {
      throw new ValidationError(parsed.error.message);
    }

    const allocation = await this.requireOwnedAllocation(id, ownerId);
    const account = await this.requireEligibleFundingAccount(allocation.accountId, ownerId);

    await this.assertWithinAvailableBalance(ownerId, account, parsed.data.amount, allocation.id);

    return this.goalAllocationRepository.update(id, ownerId, { amount: parsed.data.amount.toFixed(2) });
  }

  // Removing an allocation only ever frees up balance — no overallocation
  // check is needed (or possible) on the way out.
  async removeAllocation(id: string, ownerId: string): Promise<void> {
    await this.requireOwnedAllocation(id, ownerId);
    await this.goalAllocationRepository.softDelete(id, ownerId);
  }

  // Every active allocation for one goal — the raw rows behind "funding
  // sources attached to this goal" (see goals-query.ts for the
  // presentation-shaped view built from this).
  async listAllocationsForGoal(goalId: string, ownerId: string): Promise<GoalAllocation[]> {
    await this.requireOwnedGoal(goalId, ownerId);
    return this.goalAllocationRepository.listForOwnerAndGoals(ownerId, [goalId]);
  }

  // Every active allocation across every one of the owner's goals, in one
  // batch — used by goals-query.ts to build both "funding sources per
  // goal" and "unallocated balance per account" without issuing a query
  // per goal or per account.
  async listAllAllocations(ownerId: string): Promise<GoalAllocation[]> {
    const ownedGoals = await this.goalRepository.listForOwner(ownerId);
    if (ownedGoals.length === 0) return [];
    return this.goalAllocationRepository.listForOwnerAndGoals(
      ownerId,
      ownedGoals.map((goal) => goal.id),
    );
  }

  // ---- Calculations ------------------------------------------------

  async getGoalProgress(id: string, ownerId: string): Promise<GoalProgress | null> {
    const goal = await this.goalRepository.getByIdForOwner(id, ownerId);
    if (!goal) return null;

    const [contributions, allocations] = await Promise.all([
      this.goalContributionRepository.listForOwnerAndGoals(ownerId, [id]),
      this.goalAllocationRepository.listForOwnerAndGoals(ownerId, [id]),
    ]);
    return computeGoalProgress(goal, contributions, allocations);
  }

  // Batched, same "fetch once, group in memory" shape as
  // BudgetService.getBudgetPeriodSummary — one contributions query and one
  // allocations query for every goal, not one query per goal.
  async listGoalsWithProgress(ownerId: string): Promise<GoalProgress[]> {
    const ownedGoals = await this.goalRepository.listForOwner(ownerId);
    if (ownedGoals.length === 0) return [];

    const goalIds = ownedGoals.map((goal) => goal.id);
    const [contributions, allocations] = await Promise.all([
      this.goalContributionRepository.listForOwnerAndGoals(ownerId, goalIds),
      this.goalAllocationRepository.listForOwnerAndGoals(ownerId, goalIds),
    ]);

    const contributionsByGoalId = groupBy(contributions, (contribution) => contribution.goalId);
    const allocationsByGoalId = groupBy(allocations, (allocation) => allocation.goalId);

    return ownedGoals.map((goal) =>
      computeGoalProgress(goal, contributionsByGoalId.get(goal.id) ?? [], allocationsByGoalId.get(goal.id) ?? []),
    );
  }

  // Newest first, across every one of the owner's goals — for a
  // "Recent Contributions" rail, not scoped to a single goal.
  async listRecentContributions(ownerId: string, limit = 5): Promise<GoalContribution[]> {
    const ownedGoals = await this.goalRepository.listForOwner(ownerId);
    if (ownedGoals.length === 0) return [];

    const contributions = await this.goalContributionRepository.listForOwnerAndGoals(
      ownerId,
      ownedGoals.map((goal) => goal.id),
    );
    return contributions.slice(0, limit);
  }

  // ---- Private helpers -----------------------------------------------

  private async requireOwnedGoal(id: string, ownerId: string): Promise<Goal> {
    const goal = await this.goalRepository.getByIdForOwner(id, ownerId);
    if (!goal) {
      throw new NotFoundError(`Goal ${id} not found for owner ${ownerId}`);
    }
    return goal;
  }

  private async requireOwnedContribution(id: string, ownerId: string): Promise<GoalContribution> {
    const contribution = await this.goalContributionRepository.getByIdForOwner(id, ownerId);
    if (!contribution) {
      throw new NotFoundError(`Goal contribution ${id} not found for owner ${ownerId}`);
    }
    return contribution;
  }

  private async requireOwnedAllocation(id: string, ownerId: string) {
    const allocation = await this.goalAllocationRepository.getByIdForOwner(id, ownerId);
    if (!allocation) {
      throw new NotFoundError(`Goal allocation ${id} not found for owner ${ownerId}`);
    }
    return allocation;
  }

  private assertGoalEditable(goal: Goal): void {
    if (!EDITABLE_STATUSES.has(goal.status)) {
      throw new ConflictError(`Goal ${goal.id} is ${goal.status} and cannot be edited`);
    }
  }

  private async assertOwnedCategory(categoryId: string, ownerId: string): Promise<void> {
    const category = await this.categoryRepository.getByIdForOwner(categoryId, ownerId);
    if (!category) {
      throw new NotFoundError(`Category ${categoryId} not found for this owner`);
    }
  }

  private async assertOwnedAccount(accountId: string, ownerId: string): Promise<void> {
    const account = await this.accountRepository.getByIdForOwner(accountId, ownerId);
    if (!account) {
      throw new NotFoundError(`Account ${accountId} not found for this owner`);
    }
  }

  // Owned, active, an eligible account type, and has a known balance — the
  // full set of preconditions for an account to fund a goal at all.
  // Cross-owner and missing accounts both surface as the same generic
  // NotFoundError (never confirming which case applied); ineligibility
  // (wrong type, archived, no balance) is a ValidationError/ConflictError
  // instead, since the account genuinely exists and is genuinely this
  // owner's — the caller just can't use it this way.
  private async requireEligibleFundingAccount(accountId: string, ownerId: string) {
    const account = await this.accountRepository.getByIdForOwner(accountId, ownerId);
    if (!account) {
      throw new NotFoundError(`Account ${accountId} not found for this owner`);
    }
    if (account.status !== "active") {
      throw new ConflictError(`Account ${accountId} is archived and cannot fund a goal`);
    }
    if (!ELIGIBLE_ALLOCATION_ACCOUNT_TYPES.has(account.accountType)) {
      throw new ValidationError(`Account type "${account.accountType}" is not eligible to fund a goal`);
    }
    if (account.currentBalance === null) {
      throw new ValidationError(`Account ${accountId} has no balance set and cannot fund a goal`);
    }
    return account;
  }

  // The proactive half of "One Dollar May Only Be Allocated Once" — see
  // this section's header comment. excludeAllocationId omits the
  // allocation being edited from its own "other allocations" sum, so
  // re-saving the same or a smaller amount is never rejected for
  // colliding with itself.
  private async assertWithinAvailableBalance(
    ownerId: string,
    account: { id: string; currentBalance: string | null },
    amount: number,
    excludeAllocationId?: string,
  ): Promise<void> {
    const existing = await this.goalAllocationRepository.listForOwnerAndAccounts(ownerId, [account.id]);
    const others = excludeAllocationId ? existing.filter((allocation) => allocation.id !== excludeAllocationId) : existing;
    const summary = computeAccountAllocationSummary(account.id, Number(account.currentBalance), others);

    if (amount > summary.unallocatedBalance) {
      throw new ConflictError(
        `Allocating $${amount.toFixed(2)} would exceed the $${summary.unallocatedBalance.toFixed(2)} available balance for this account`,
      );
    }
  }
}

function groupBy<T, K>(items: T[], keyOf: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    const bucket = map.get(key);
    if (bucket) {
      bucket.push(item);
    } else {
      map.set(key, [item]);
    }
  }
  return map;
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}
