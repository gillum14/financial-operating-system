import { z } from "zod";

import { computeCategorySpendForPeriod } from "@/application/transactions/spending-aggregation";
import type {
  BudgetAllocationAdjustmentRepository,
  BudgetAllocationRepository,
  BudgetPeriodRepository,
} from "@/domains/budgets/repository";
import type { BudgetAllocation, BudgetAllocationAdjustment, BudgetPeriod, BudgetPeriodStatus } from "@/domains/budgets/types";
import type { CategoryRepository } from "@/domains/categories/repository";
import { ConflictError, NotFoundError, ValidationError } from "@/domains/errors";
import type { TransactionRepository } from "@/domains/transactions/repository";

import {
  computeAllocationSummaries,
  computeBudgetPeriodTotals,
  type BudgetAllocationSummary,
  type BudgetPeriodTotals,
} from "./budget-calculations";

// Only Draft and Active periods accept allocation changes — budgets-
// model.md §20: "Athena must never... Recalculate historical snapshots" /
// budgets-specification.md §10: "Budget adjustments should never rewrite
// historical transaction activity." A Completed or Archived period's
// allocations are frozen; its "spent" figures still compute live from
// Transactions (never fabricated), but its *plan* can no longer change.
const EDITABLE_STATUSES = new Set<BudgetPeriodStatus>(["draft", "active"]);

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a YYYY-MM-DD date");

const createBudgetPeriodSchema = z
  .object({
    ownerId: z.string().uuid(),
    periodStart: dateStringSchema,
    periodEnd: dateStringSchema,
  })
  .refine((data) => data.periodEnd >= data.periodStart, {
    message: "periodEnd must not be before periodStart",
    path: ["periodEnd"],
  });

const addAllocationSchema = z.object({
  ownerId: z.string().uuid(),
  budgetPeriodId: z.string().uuid(),
  categoryId: z.string().uuid(),
  plannedAmount: z.number().nonnegative().finite(),
});

const updateAllocationAmountSchema = z.object({
  plannedAmount: z.number().nonnegative().finite(),
});

export interface BudgetPeriodSummary {
  period: BudgetPeriod;
  allocations: BudgetAllocationSummary[];
  totals: BudgetPeriodTotals;
  recentAdjustments: BudgetAllocationAdjustment[];
}

export class BudgetService {
  constructor(
    private readonly budgetPeriodRepository: BudgetPeriodRepository,
    private readonly budgetAllocationRepository: BudgetAllocationRepository,
    private readonly budgetAllocationAdjustmentRepository: BudgetAllocationAdjustmentRepository,
    private readonly categoryRepository: CategoryRepository,
    private readonly transactionRepository: TransactionRepository,
  ) {}

  // ---- Budget Period lifecycle -------------------------------------

  async createBudgetPeriod(input: { ownerId: string; periodStart: string; periodEnd: string }): Promise<BudgetPeriod> {
    const parsed = createBudgetPeriodSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.message);
    }

    return this.budgetPeriodRepository.create(parsed.data);
  }

  async listBudgetPeriods(ownerId: string): Promise<BudgetPeriod[]> {
    return this.budgetPeriodRepository.listForOwner(ownerId);
  }

  async getBudgetPeriod(id: string, ownerId: string): Promise<BudgetPeriod | null> {
    return this.budgetPeriodRepository.getByIdForOwner(id, ownerId);
  }

  async getActiveBudgetPeriod(ownerId: string): Promise<BudgetPeriod | null> {
    return this.budgetPeriodRepository.getActiveForOwner(ownerId);
  }

  // Draft -> Active only. The database's own partial unique index
  // (budget_periods_one_active_per_owner_idx) is the ultimate guarantee
  // that at most one period is ever active per owner; this check exists
  // to fail with a clear ConflictError instead of a raw constraint
  // violation reaching the caller.
  async activateBudgetPeriod(id: string, ownerId: string): Promise<BudgetPeriod> {
    const period = await this.requireOwnedPeriod(id, ownerId);
    if (period.status !== "draft") {
      throw new ConflictError(`Budget period ${id} must be in draft status to activate (current: ${period.status})`);
    }

    const currentlyActive = await this.budgetPeriodRepository.getActiveForOwner(ownerId);
    if (currentlyActive && currentlyActive.id !== id) {
      throw new ConflictError(
        `Owner already has an active budget period (${currentlyActive.id}) — complete or archive it before activating another`,
      );
    }

    return this.budgetPeriodRepository.updateStatus(id, ownerId, { status: "active" });
  }

  // Active -> Completed only. No Reopen transition in this slice — model
  // doc: "Active ⇄ Reopened... requires explicit rules and auditing," left
  // for a future iteration rather than guessed at here.
  async completeBudgetPeriod(id: string, ownerId: string): Promise<BudgetPeriod> {
    const period = await this.requireOwnedPeriod(id, ownerId);
    if (period.status !== "active") {
      throw new ConflictError(`Budget period ${id} must be active to complete (current: ${period.status})`);
    }

    return this.budgetPeriodRepository.updateStatus(id, ownerId, { status: "completed" });
  }

  // Draft, Active, or Completed -> Archived. Archiving never deletes the
  // row (see repository: no DELETE grant exists on budget_periods at
  // all) — it is a soft, reversible-in-principle status marker, matching
  // "no hard-delete path for historical budget data."
  async archiveBudgetPeriod(id: string, ownerId: string): Promise<BudgetPeriod> {
    const period = await this.requireOwnedPeriod(id, ownerId);
    if (period.status === "archived") {
      throw new ConflictError(`Budget period ${id} is already archived`);
    }

    return this.budgetPeriodRepository.updateStatus(id, ownerId, { status: "archived" });
  }

  // ---- Budget Allocations --------------------------------------------

  async addAllocation(input: {
    ownerId: string;
    budgetPeriodId: string;
    categoryId: string;
    plannedAmount: number;
  }): Promise<BudgetAllocation> {
    const parsed = addAllocationSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.message);
    }

    const period = await this.requireOwnedPeriod(parsed.data.budgetPeriodId, parsed.data.ownerId);
    this.assertPeriodEditable(period);
    await this.assertOwnedCategory(parsed.data.categoryId, parsed.data.ownerId);

    const siblings = await this.budgetAllocationRepository.listForOwner(parsed.data.ownerId, {
      budgetPeriodId: parsed.data.budgetPeriodId,
    });
    if (siblings.some((allocation) => allocation.categoryId === parsed.data.categoryId)) {
      throw new ConflictError(`Category ${parsed.data.categoryId} is already allocated in this budget period`);
    }

    // Append-to-end, same nextSortOrder(max+1) convention as
    // CategoryService — never siblings.length, so a removed-then-re-added
    // allocation can't collide with a display order a remaining sibling
    // still holds.
    const displayOrder = siblings.length === 0 ? 0 : Math.max(...siblings.map((row) => row.displayOrder)) + 1;

    return this.budgetAllocationRepository.create({
      ownerId: parsed.data.ownerId,
      budgetPeriodId: parsed.data.budgetPeriodId,
      categoryId: parsed.data.categoryId,
      plannedAmount: parsed.data.plannedAmount.toFixed(2),
      displayOrder,
    });
  }

  async updateAllocationAmount(id: string, ownerId: string, plannedAmount: number): Promise<BudgetAllocation> {
    const parsed = updateAllocationAmountSchema.safeParse({ plannedAmount });
    if (!parsed.success) {
      throw new ValidationError(parsed.error.message);
    }

    const allocation = await this.requireOwnedAllocation(id, ownerId);
    const period = await this.requireOwnedPeriod(allocation.budgetPeriodId, ownerId);
    this.assertPeriodEditable(period);

    const newAmount = parsed.data.plannedAmount.toFixed(2);

    // Adjustment history is written for every real change to the planned
    // amount — budgets-model.md §8: "Adjustments preserve historical
    // planning decisions." Comparing as numbers (not raw strings) guards
    // against a no-op update (e.g. re-submitting the same amount) logging
    // a spurious adjustment purely from string formatting differences.
    if (Number(newAmount) !== Number(allocation.plannedAmount)) {
      await this.budgetAllocationAdjustmentRepository.create({
        ownerId,
        budgetAllocationId: id,
        previousAmount: allocation.plannedAmount,
        newAmount,
      });
    }

    return this.budgetAllocationRepository.update(id, ownerId, { plannedAmount: newAmount });
  }

  async removeAllocation(id: string, ownerId: string): Promise<void> {
    const allocation = await this.requireOwnedAllocation(id, ownerId);
    const period = await this.requireOwnedPeriod(allocation.budgetPeriodId, ownerId);
    this.assertPeriodEditable(period);

    await this.budgetAllocationRepository.softDelete(id, ownerId);
  }

  // ---- Calculations ----------------------------------------------------

  // Null only when the period itself doesn't exist/isn't owned by this
  // caller — an existing period with zero allocations still returns a
  // real summary (empty allocations array, all-zero totals), the honest
  // "empty budget" case rather than a fabricated absence.
  async getBudgetPeriodSummary(ownerId: string, budgetPeriodId: string): Promise<BudgetPeriodSummary | null> {
    const period = await this.budgetPeriodRepository.getByIdForOwner(budgetPeriodId, ownerId);
    if (!period) return null;

    const allocations = await this.budgetAllocationRepository.listForOwner(ownerId, { budgetPeriodId });

    const categories = await this.categoryRepository.listForOwner(ownerId);
    const categoriesById = new Map(categories.map((category) => [category.id, category]));

    // One query for the whole period's transactions, then group in
    // memory — the same "fetch the batch once, reduce in JS" shape
    // DashboardService already uses, rather than one query per
    // allocation. includeExcluded defaults to false at the repository
    // filter layer, and transfers are dropped by
    // computeCategorySpendForPeriod itself — both "exclude" rules apply
    // without this method re-implementing either.
    const periodTransactions = await this.transactionRepository.listForOwner(ownerId, {
      dateFrom: period.periodStart,
      dateTo: period.periodEnd,
    });
    const actualSpendByCategoryId = computeCategorySpendForPeriod(periodTransactions);

    const allocationSummaries = computeAllocationSummaries(allocations, actualSpendByCategoryId, categoriesById);
    const totals = computeBudgetPeriodTotals(allocationSummaries);

    const recentAdjustments = await this.budgetAllocationAdjustmentRepository.listForOwnerAndAllocations(
      ownerId,
      allocations.map((allocation) => allocation.id),
    );

    return { period, allocations: allocationSummaries, totals, recentAdjustments: recentAdjustments.slice(0, 5) };
  }

  // ---- Private helpers ---------------------------------------------

  private async requireOwnedPeriod(id: string, ownerId: string): Promise<BudgetPeriod> {
    const period = await this.budgetPeriodRepository.getByIdForOwner(id, ownerId);
    if (!period) {
      throw new NotFoundError(`Budget period ${id} not found for owner ${ownerId}`);
    }
    return period;
  }

  private async requireOwnedAllocation(id: string, ownerId: string): Promise<BudgetAllocation> {
    const allocation = await this.budgetAllocationRepository.getByIdForOwner(id, ownerId);
    if (!allocation) {
      throw new NotFoundError(`Budget allocation ${id} not found for owner ${ownerId}`);
    }
    return allocation;
  }

  private assertPeriodEditable(period: BudgetPeriod): void {
    if (!EDITABLE_STATUSES.has(period.status)) {
      throw new ConflictError(`Budget period ${period.id} is ${period.status} and its allocations cannot be edited`);
    }
  }

  // Mirrors TransactionService's private assertOwnedCategory exactly —
  // getByIdForOwner already excludes other owners' and soft-deleted rows,
  // so a foreign/missing category surfaces as the same generic
  // NotFoundError either way, never confirming which case applied.
  private async assertOwnedCategory(categoryId: string, ownerId: string): Promise<void> {
    const category = await this.categoryRepository.getByIdForOwner(categoryId, ownerId);
    if (!category) {
      throw new NotFoundError(`Category ${categoryId} not found for this owner`);
    }
  }
}
