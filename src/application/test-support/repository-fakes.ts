import { randomUUID } from "node:crypto";

import type { AccountRepository } from "@/domains/accounts/repository";
import type { Account, AccountCreateInput, AccountUpdateInput } from "@/domains/accounts/types";
import type {
  BudgetAllocationAdjustmentRepository,
  BudgetAllocationRepository,
  BudgetPeriodRepository,
} from "@/domains/budgets/repository";
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
} from "@/domains/budgets/types";
import type { CategoryRepository } from "@/domains/categories/repository";
import type { Category, CategoryCreateInput, CategoryUpdateInput } from "@/domains/categories/types";
import type { DataProviderConnectionRepository } from "@/domains/data-provider-connections/repository";
import type {
  DataProviderConnection,
  DataProviderConnectionCreateInput,
  DataProviderConnectionUpdateInput,
} from "@/domains/data-provider-connections/types";
import { NotFoundError } from "@/domains/errors";
import type { GoalAllocationRepository, GoalContributionRepository, GoalRepository } from "@/domains/goals/repository";
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
} from "@/domains/goals/types";
import type { InstitutionRepository } from "@/domains/institutions/repository";
import type { Institution, InstitutionCreateInput, InstitutionUpdateInput } from "@/domains/institutions/types";
import type { AccountBalanceSnapshotRepository } from "@/domains/net-worth-history/repository";
import type { AccountBalanceSnapshot, AccountBalanceSnapshotCreateInput } from "@/domains/net-worth-history/types";
import type { TransactionRepository } from "@/domains/transactions/repository";
import type {
  Transaction,
  TransactionCreateInput,
  TransactionListFilter,
  TransactionUpdateInput,
} from "@/domains/transactions/types";
import type { UserRepository } from "@/domains/users/repository";
import type { User, UserCreateInput, UserUpdateInput } from "@/domains/users/types";

// Small in-memory stand-ins for the repository interfaces, used by service
// unit tests so they exercise real owner-scoping/soft-delete behavior
// without needing a live database.

export class FakeUserRepository implements UserRepository {
  private readonly rows = new Map<string, User>();

  async getById(id: string): Promise<User | null> {
    const row = this.rows.get(id);
    return row && !row.deletedAt ? row : null;
  }

  async getByEmail(email: string): Promise<User | null> {
    for (const row of this.rows.values()) {
      if (row.email === email && !row.deletedAt) return row;
    }
    return null;
  }

  async create(input: UserCreateInput): Promise<User> {
    const now = new Date();
    const row: User = {
      id: input.id,
      email: input.email,
      displayName: input.displayName,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    this.rows.set(row.id, row);
    return row;
  }

  async update(id: string, changes: UserUpdateInput): Promise<User> {
    const row = await this.getById(id);
    if (!row) throw new NotFoundError(`User ${id} not found`);
    const updated = { ...row, ...changes, updatedAt: new Date() };
    this.rows.set(id, updated);
    return updated;
  }

  async softDelete(id: string): Promise<void> {
    const row = this.rows.get(id);
    if (row) this.rows.set(id, { ...row, deletedAt: new Date() });
  }
}

export class FakeInstitutionRepository implements InstitutionRepository {
  private readonly rows = new Map<string, Institution>();

  async getById(id: string): Promise<Institution | null> {
    const row = this.rows.get(id);
    return row && !row.deletedAt ? row : null;
  }

  async list(): Promise<Institution[]> {
    return [...this.rows.values()].filter((row) => !row.deletedAt);
  }

  async create(input: InstitutionCreateInput): Promise<Institution> {
    const now = new Date();
    const row: Institution = {
      id: randomUUID(),
      name: input.name,
      providerName: input.providerName ?? null,
      logoUrl: input.logoUrl ?? null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    this.rows.set(row.id, row);
    return row;
  }

  async update(id: string, changes: InstitutionUpdateInput): Promise<Institution> {
    const row = await this.getById(id);
    if (!row) throw new NotFoundError(`Institution ${id} not found`);
    const updated = { ...row, ...changes, updatedAt: new Date() };
    this.rows.set(id, updated);
    return updated;
  }

  async softDelete(id: string): Promise<void> {
    const row = this.rows.get(id);
    if (row) this.rows.set(id, { ...row, deletedAt: new Date() });
  }
}

export class FakeAccountRepository implements AccountRepository {
  private readonly rows = new Map<string, Account>();

  async getByIdForOwner(id: string, ownerId: string): Promise<Account | null> {
    const row = this.rows.get(id);
    return row && row.ownerId === ownerId && !row.deletedAt ? row : null;
  }

  async listForOwner(ownerId: string, status?: Account["status"]): Promise<Account[]> {
    return [...this.rows.values()].filter(
      (row) => row.ownerId === ownerId && !row.deletedAt && (!status || row.status === status),
    );
  }

  async create(input: AccountCreateInput): Promise<Account> {
    const now = new Date();
    const row: Account = {
      id: randomUUID(),
      ownerId: input.ownerId,
      institutionId: input.institutionId ?? null,
      name: input.name,
      accountType: input.accountType,
      maskedAccountNumber: input.maskedAccountNumber ?? null,
      currency: input.currency ?? "USD",
      status: input.status ?? "active",
      balanceSource: input.balanceSource ?? "manual",
      currentBalance: input.currentBalance ?? null,
      openingDate: input.openingDate ?? null,
      closingDate: input.closingDate ?? null,
      notes: input.notes ?? null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    this.rows.set(row.id, row);
    return row;
  }

  async update(id: string, ownerId: string, changes: AccountUpdateInput): Promise<Account> {
    const row = await this.getByIdForOwner(id, ownerId);
    if (!row) throw new NotFoundError(`Account ${id} not found for owner ${ownerId}`);
    const updated = { ...row, ...changes, updatedAt: new Date() };
    this.rows.set(id, updated);
    return updated;
  }

  async archive(id: string, ownerId: string): Promise<Account> {
    return this.update(id, ownerId, { status: "archived" });
  }

  async restore(id: string, ownerId: string): Promise<Account> {
    return this.update(id, ownerId, { status: "active" });
  }

  async softDelete(id: string, ownerId: string): Promise<void> {
    const row = await this.getByIdForOwner(id, ownerId);
    if (!row) throw new NotFoundError(`Account ${id} not found for owner ${ownerId}`);
    this.rows.set(id, { ...row, deletedAt: new Date() });
  }
}

function bySortOrderThenCreatedAt(a: Category, b: Category): number {
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  return a.createdAt.getTime() - b.createdAt.getTime();
}

export class FakeCategoryRepository implements CategoryRepository {
  private readonly rows = new Map<string, Category>();

  async getByIdForOwner(id: string, ownerId: string): Promise<Category | null> {
    const row = this.rows.get(id);
    return row && row.ownerId === ownerId && !row.deletedAt ? row : null;
  }

  async listForOwner(ownerId: string): Promise<Category[]> {
    return [...this.rows.values()]
      .filter((row) => row.ownerId === ownerId && !row.deletedAt)
      .sort(bySortOrderThenCreatedAt);
  }

  async listChildren(parentCategoryId: string, ownerId: string): Promise<Category[]> {
    return [...this.rows.values()]
      .filter((row) => row.parentCategoryId === parentCategoryId && row.ownerId === ownerId && !row.deletedAt)
      .sort(bySortOrderThenCreatedAt);
  }

  async create(input: CategoryCreateInput): Promise<Category> {
    const now = new Date();
    const row: Category = {
      id: randomUUID(),
      ownerId: input.ownerId,
      name: input.name,
      parentCategoryId: input.parentCategoryId ?? null,
      color: input.color ?? null,
      description: input.description ?? null,
      sortOrder: input.sortOrder ?? 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    this.rows.set(row.id, row);
    return row;
  }

  async update(id: string, ownerId: string, changes: CategoryUpdateInput): Promise<Category> {
    const row = await this.getByIdForOwner(id, ownerId);
    if (!row) throw new NotFoundError(`Category ${id} not found for owner ${ownerId}`);
    const updated = { ...row, ...changes, updatedAt: new Date() };
    this.rows.set(id, updated);
    return updated;
  }

  async softDelete(id: string, ownerId: string): Promise<void> {
    const row = await this.getByIdForOwner(id, ownerId);
    if (!row) throw new NotFoundError(`Category ${id} not found for owner ${ownerId}`);
    this.rows.set(id, { ...row, deletedAt: new Date() });
  }

  async reorder(ownerId: string, orderedIds: string[]): Promise<Category[]> {
    const updated: Category[] = [];
    for (let index = 0; index < orderedIds.length; index += 1) {
      const id = orderedIds[index];
      const row = await this.getByIdForOwner(id, ownerId);
      if (!row) throw new NotFoundError(`Category ${id} not found for owner ${ownerId}`);
      const next = { ...row, sortOrder: index, updatedAt: new Date() };
      this.rows.set(id, next);
      updated.push(next);
    }
    return updated;
  }
}

export class FakeTransactionRepository implements TransactionRepository {
  private readonly rows = new Map<string, Transaction>();

  async getByIdForOwner(id: string, ownerId: string): Promise<Transaction | null> {
    const row = this.rows.get(id);
    return row && row.ownerId === ownerId && !row.deletedAt ? row : null;
  }

  private matchesFilter(row: Transaction, ownerId: string, filter?: TransactionListFilter): boolean {
    if (row.ownerId !== ownerId || row.deletedAt) return false;
    if (filter?.accountId && row.accountId !== filter.accountId) return false;
    if (filter?.categoryId && row.categoryId !== filter.categoryId) return false;
    if (filter?.transactionType && row.transactionType !== filter.transactionType) return false;
    if (filter?.dateFrom && row.transactionDate < filter.dateFrom) return false;
    if (filter?.dateTo && row.transactionDate > filter.dateTo) return false;
    if (!filter?.includeExcluded && row.isExcluded) return false;
    if (filter?.search) {
      const needle = filter.search.toLowerCase();
      const haystack = `${row.originalDescription} ${row.merchant ?? ""}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  }

  async listForOwner(ownerId: string, filter?: TransactionListFilter): Promise<Transaction[]> {
    const matches = [...this.rows.values()].filter((row) => this.matchesFilter(row, ownerId, filter));
    const direction = filter?.sort ?? "desc";

    // Same stable order as DrizzleTransactionRepository: transactionDate
    // then id as a tie-breaker (id compared as a plain string — good
    // enough for a fake; the real repository's DB-generated UUIDs don't
    // need to sort meaningfully, only deterministically).
    matches.sort((a, b) => {
      const dateCmp = a.transactionDate === b.transactionDate ? 0 : a.transactionDate < b.transactionDate ? -1 : 1;
      const cmp = dateCmp !== 0 ? dateCmp : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
      return direction === "asc" ? cmp : -cmp;
    });

    const afterCursor = filter?.cursor
      ? matches.filter((row) => {
          const { transactionDate, id } = filter.cursor!;
          if (row.transactionDate !== transactionDate) {
            return direction === "asc" ? row.transactionDate > transactionDate : row.transactionDate < transactionDate;
          }
          return direction === "asc" ? row.id > id : row.id < id;
        })
      : matches;

    return filter?.limit ? afterCursor.slice(0, filter.limit) : afterCursor;
  }

  async countForOwner(ownerId: string, filter?: TransactionListFilter): Promise<number> {
    return [...this.rows.values()].filter((row) => this.matchesFilter(row, ownerId, filter)).length;
  }

  async create(input: TransactionCreateInput): Promise<Transaction> {
    const now = new Date();
    const row: Transaction = {
      id: randomUUID(),
      ownerId: input.ownerId,
      accountId: input.accountId,
      categoryId: input.categoryId ?? null,
      transactionDate: input.transactionDate,
      postingDate: input.postingDate ?? null,
      originalDescription: input.originalDescription,
      merchant: input.merchant ?? null,
      amount: input.amount,
      transactionType: input.transactionType,
      isExcluded: input.isExcluded ?? false,
      notes: input.notes ?? null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    this.rows.set(row.id, row);
    return row;
  }

  async update(id: string, ownerId: string, changes: TransactionUpdateInput): Promise<Transaction> {
    const row = await this.getByIdForOwner(id, ownerId);
    if (!row) throw new NotFoundError(`Transaction ${id} not found for owner ${ownerId}`);
    const updated = { ...row, ...changes, updatedAt: new Date() };
    this.rows.set(id, updated);
    return updated;
  }

  async softDelete(id: string, ownerId: string): Promise<void> {
    const row = this.rows.get(id);
    if (row && row.ownerId === ownerId) this.rows.set(id, { ...row, deletedAt: new Date() });
  }
}

export class FakeBudgetPeriodRepository implements BudgetPeriodRepository {
  private readonly rows = new Map<string, BudgetPeriod>();

  async getByIdForOwner(id: string, ownerId: string): Promise<BudgetPeriod | null> {
    const row = this.rows.get(id);
    return row && row.ownerId === ownerId && !row.deletedAt ? row : null;
  }

  async listForOwner(ownerId: string): Promise<BudgetPeriod[]> {
    return [...this.rows.values()]
      .filter((row) => row.ownerId === ownerId && !row.deletedAt)
      .sort((a, b) => (a.periodStart < b.periodStart ? 1 : a.periodStart > b.periodStart ? -1 : 0));
  }

  async getActiveForOwner(ownerId: string): Promise<BudgetPeriod | null> {
    return (
      [...this.rows.values()].find((row) => row.ownerId === ownerId && row.status === "active" && !row.deletedAt) ??
      null
    );
  }

  async create(input: BudgetPeriodCreateInput): Promise<BudgetPeriod> {
    const now = new Date();
    const row: BudgetPeriod = {
      id: randomUUID(),
      ownerId: input.ownerId,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      status: "draft",
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    this.rows.set(row.id, row);
    return row;
  }

  async updateStatus(id: string, ownerId: string, changes: BudgetPeriodStatusUpdateInput): Promise<BudgetPeriod> {
    const row = await this.getByIdForOwner(id, ownerId);
    if (!row) throw new NotFoundError(`Budget period ${id} not found for owner ${ownerId}`);
    const updated = { ...row, ...changes, updatedAt: new Date() };
    this.rows.set(id, updated);
    return updated;
  }
}

export class FakeBudgetAllocationRepository implements BudgetAllocationRepository {
  private readonly rows = new Map<string, BudgetAllocation>();

  async getByIdForOwner(id: string, ownerId: string): Promise<BudgetAllocation | null> {
    const row = this.rows.get(id);
    return row && row.ownerId === ownerId && !row.deletedAt ? row : null;
  }

  async listForOwner(ownerId: string, filter?: BudgetAllocationListFilter): Promise<BudgetAllocation[]> {
    return [...this.rows.values()]
      .filter(
        (row) =>
          row.ownerId === ownerId &&
          !row.deletedAt &&
          (!filter?.budgetPeriodId || row.budgetPeriodId === filter.budgetPeriodId),
      )
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }

  async create(input: BudgetAllocationCreateInput & { displayOrder: number }): Promise<BudgetAllocation> {
    const now = new Date();
    const row: BudgetAllocation = {
      id: randomUUID(),
      ownerId: input.ownerId,
      budgetPeriodId: input.budgetPeriodId,
      categoryId: input.categoryId,
      plannedAmount: input.plannedAmount,
      displayOrder: input.displayOrder,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    this.rows.set(row.id, row);
    return row;
  }

  async update(id: string, ownerId: string, changes: BudgetAllocationUpdateInput): Promise<BudgetAllocation> {
    const row = await this.getByIdForOwner(id, ownerId);
    if (!row) throw new NotFoundError(`Budget allocation ${id} not found for owner ${ownerId}`);
    const updated = { ...row, ...changes, updatedAt: new Date() };
    this.rows.set(id, updated);
    return updated;
  }

  async softDelete(id: string, ownerId: string): Promise<void> {
    const row = await this.getByIdForOwner(id, ownerId);
    if (!row) throw new NotFoundError(`Budget allocation ${id} not found for owner ${ownerId}`);
    this.rows.set(id, { ...row, deletedAt: new Date() });
  }
}

// Insert-only, matching DrizzleBudgetAllocationAdjustmentRepository — no
// update/softDelete methods exist on the real interface either.
export class FakeBudgetAllocationAdjustmentRepository implements BudgetAllocationAdjustmentRepository {
  private readonly rows: BudgetAllocationAdjustment[] = [];

  async listForOwnerAndAllocations(ownerId: string, budgetAllocationIds: string[]): Promise<BudgetAllocationAdjustment[]> {
    const idSet = new Set(budgetAllocationIds);
    return this.rows
      .filter((row) => row.ownerId === ownerId && idSet.has(row.budgetAllocationId))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async create(input: BudgetAllocationAdjustmentCreateInput): Promise<BudgetAllocationAdjustment> {
    const row: BudgetAllocationAdjustment = {
      id: randomUUID(),
      ownerId: input.ownerId,
      budgetAllocationId: input.budgetAllocationId,
      previousAmount: input.previousAmount,
      newAmount: input.newAmount,
      createdAt: new Date(),
    };
    this.rows.push(row);
    return row;
  }
}

export class FakeGoalRepository implements GoalRepository {
  private readonly rows = new Map<string, Goal>();

  async getByIdForOwner(id: string, ownerId: string): Promise<Goal | null> {
    const row = this.rows.get(id);
    return row && row.ownerId === ownerId && !row.deletedAt ? row : null;
  }

  async listForOwner(ownerId: string): Promise<Goal[]> {
    return [...this.rows.values()]
      .filter((row) => row.ownerId === ownerId && !row.deletedAt)
      .sort((a, b) => (a.displayOrder !== b.displayOrder ? a.displayOrder - b.displayOrder : a.createdAt.getTime() - b.createdAt.getTime()));
  }

  async create(input: GoalCreateInput & { displayOrder: number }): Promise<Goal> {
    const now = new Date();
    const row: Goal = {
      id: randomUUID(),
      ownerId: input.ownerId,
      categoryId: input.categoryId ?? null,
      accountId: input.accountId ?? null,
      title: input.title,
      description: input.description ?? null,
      targetAmount: input.targetAmount,
      targetDate: input.targetDate ?? null,
      goalType: input.goalType,
      status: "active",
      priority: input.priority ?? "medium",
      icon: input.icon ?? null,
      color: input.color ?? null,
      displayOrder: input.displayOrder,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    this.rows.set(row.id, row);
    return row;
  }

  async update(id: string, ownerId: string, changes: GoalUpdateInput): Promise<Goal> {
    const row = await this.getByIdForOwner(id, ownerId);
    if (!row) throw new NotFoundError(`Goal ${id} not found for owner ${ownerId}`);
    const updated = { ...row, ...changes, updatedAt: new Date() };
    this.rows.set(id, updated);
    return updated;
  }

  async updateStatus(id: string, ownerId: string, changes: GoalStatusUpdateInput): Promise<Goal> {
    const row = await this.getByIdForOwner(id, ownerId);
    if (!row) throw new NotFoundError(`Goal ${id} not found for owner ${ownerId}`);
    const updated = { ...row, ...changes, completedAt: changes.completedAt ?? row.completedAt, updatedAt: new Date() };
    this.rows.set(id, updated);
    return updated;
  }

  async softDelete(id: string, ownerId: string): Promise<void> {
    const row = await this.getByIdForOwner(id, ownerId);
    if (!row) throw new NotFoundError(`Goal ${id} not found for owner ${ownerId}`);
    this.rows.set(id, { ...row, deletedAt: new Date() });
  }
}

export class FakeGoalContributionRepository implements GoalContributionRepository {
  private readonly rows = new Map<string, GoalContribution>();

  async getByIdForOwner(id: string, ownerId: string): Promise<GoalContribution | null> {
    const row = this.rows.get(id);
    return row && row.ownerId === ownerId && !row.deletedAt ? row : null;
  }

  async listForOwnerAndGoals(ownerId: string, goalIds: string[]): Promise<GoalContribution[]> {
    const idSet = new Set(goalIds);
    return [...this.rows.values()]
      .filter((row) => row.ownerId === ownerId && idSet.has(row.goalId) && !row.deletedAt)
      .sort((a, b) => (a.contributionDate === b.contributionDate ? 0 : a.contributionDate < b.contributionDate ? 1 : -1));
  }

  async create(input: GoalContributionCreateInput): Promise<GoalContribution> {
    const now = new Date();
    const row: GoalContribution = {
      id: randomUUID(),
      ownerId: input.ownerId,
      goalId: input.goalId,
      amount: input.amount,
      contributionDate: input.contributionDate,
      note: input.note ?? null,
      source: input.source ?? "manual",
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    this.rows.set(row.id, row);
    return row;
  }

  async update(id: string, ownerId: string, changes: GoalContributionUpdateInput): Promise<GoalContribution> {
    const row = await this.getByIdForOwner(id, ownerId);
    if (!row) throw new NotFoundError(`Goal contribution ${id} not found for owner ${ownerId}`);
    const updated = { ...row, ...changes, updatedAt: new Date() };
    this.rows.set(id, updated);
    return updated;
  }

  async softDelete(id: string, ownerId: string): Promise<void> {
    const row = await this.getByIdForOwner(id, ownerId);
    if (!row) throw new NotFoundError(`Goal contribution ${id} not found for owner ${ownerId}`);
    this.rows.set(id, { ...row, deletedAt: new Date() });
  }
}

// Plain CRUD only — no overallocation enforcement here. GoalService's own
// proactive check (assertWithinAvailableBalance) is what unit tests
// against this fake exercise; the real, concurrency-safe enforcement is
// the goal_allocations_no_overallocation database trigger, which only a
// real Postgres connection can meaningfully test (see the DB-backed
// concurrency test in infrastructure/db/goals-repository.test.ts).
export class FakeGoalAllocationRepository implements GoalAllocationRepository {
  private readonly rows = new Map<string, GoalAllocation>();

  async getByIdForOwner(id: string, ownerId: string): Promise<GoalAllocation | null> {
    const row = this.rows.get(id);
    return row && row.ownerId === ownerId && !row.deletedAt ? row : null;
  }

  async listForOwnerAndGoals(ownerId: string, goalIds: string[]): Promise<GoalAllocation[]> {
    const idSet = new Set(goalIds);
    return [...this.rows.values()].filter((row) => row.ownerId === ownerId && idSet.has(row.goalId) && !row.deletedAt);
  }

  async listForOwnerAndAccounts(ownerId: string, accountIds: string[]): Promise<GoalAllocation[]> {
    const idSet = new Set(accountIds);
    return [...this.rows.values()].filter(
      (row) => row.ownerId === ownerId && idSet.has(row.accountId) && !row.deletedAt,
    );
  }

  async create(input: GoalAllocationCreateInput): Promise<GoalAllocation> {
    const now = new Date();
    const row: GoalAllocation = {
      id: randomUUID(),
      ownerId: input.ownerId,
      goalId: input.goalId,
      accountId: input.accountId,
      amount: input.amount,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    this.rows.set(row.id, row);
    return row;
  }

  async update(id: string, ownerId: string, changes: GoalAllocationUpdateInput): Promise<GoalAllocation> {
    const row = await this.getByIdForOwner(id, ownerId);
    if (!row) throw new NotFoundError(`Goal allocation ${id} not found for owner ${ownerId}`);
    const updated = { ...row, ...changes, updatedAt: new Date() };
    this.rows.set(id, updated);
    return updated;
  }

  async softDelete(id: string, ownerId: string): Promise<void> {
    const row = await this.getByIdForOwner(id, ownerId);
    if (!row) throw new NotFoundError(`Goal allocation ${id} not found for owner ${ownerId}`);
    this.rows.set(id, { ...row, deletedAt: new Date() });
  }
}

// Insert-only, matching DrizzleAccountBalanceSnapshotRepository — no
// update/softDelete methods on the real interface either (this table is
// genuinely immutable, see the schema/migration). createMany replicates
// the real repository's ON CONFLICT DO NOTHING semantics: a duplicate
// (accountId, snapshotDate) pair is silently skipped, not overwritten and
// not duplicated, and only the newly-written rows are returned.
export class FakeAccountBalanceSnapshotRepository implements AccountBalanceSnapshotRepository {
  private readonly rows = new Map<string, AccountBalanceSnapshot>();
  private readonly byAccountAndDate = new Set<string>();

  async getByIdForOwner(id: string, ownerId: string): Promise<AccountBalanceSnapshot | null> {
    const row = this.rows.get(id);
    return row && row.ownerId === ownerId ? row : null;
  }

  async listForOwner(ownerId: string): Promise<AccountBalanceSnapshot[]> {
    return [...this.rows.values()]
      .filter((row) => row.ownerId === ownerId)
      .sort((a, b) => (a.snapshotDate < b.snapshotDate ? -1 : a.snapshotDate > b.snapshotDate ? 1 : 0));
  }

  async listForOwnerAndAccount(ownerId: string, accountId: string): Promise<AccountBalanceSnapshot[]> {
    return [...this.rows.values()]
      .filter((row) => row.ownerId === ownerId && row.accountId === accountId)
      .sort((a, b) => (a.snapshotDate < b.snapshotDate ? -1 : a.snapshotDate > b.snapshotDate ? 1 : 0));
  }

  async createMany(inputs: AccountBalanceSnapshotCreateInput[]): Promise<AccountBalanceSnapshot[]> {
    const now = new Date();
    const inserted: AccountBalanceSnapshot[] = [];

    for (const input of inputs) {
      const conflictKey = `${input.accountId}:${input.snapshotDate}`;
      if (this.byAccountAndDate.has(conflictKey)) continue;

      const row: AccountBalanceSnapshot = {
        id: randomUUID(),
        ownerId: input.ownerId,
        accountId: input.accountId,
        snapshotDate: input.snapshotDate,
        balance: input.balance,
        accountType: input.accountType,
        balanceSource: input.balanceSource,
        snapshotType: input.snapshotType ?? "monthly",
        createdAt: now,
      };
      this.rows.set(row.id, row);
      this.byAccountAndDate.add(conflictKey);
      inserted.push(row);
    }

    return inserted;
  }
}

export class FakeDataProviderConnectionRepository implements DataProviderConnectionRepository {
  private readonly rows = new Map<string, DataProviderConnection>();

  async getByIdForOwner(id: string, ownerId: string): Promise<DataProviderConnection | null> {
    const row = this.rows.get(id);
    return row && row.ownerId === ownerId && !row.deletedAt ? row : null;
  }

  async listForOwner(ownerId: string): Promise<DataProviderConnection[]> {
    return [...this.rows.values()].filter((row) => row.ownerId === ownerId && !row.deletedAt);
  }

  async create(input: DataProviderConnectionCreateInput): Promise<DataProviderConnection> {
    const now = new Date();
    const row: DataProviderConnection = {
      id: randomUUID(),
      ownerId: input.ownerId,
      institutionId: input.institutionId ?? null,
      providerName: input.providerName,
      externalReference: input.externalReference ?? null,
      status: input.status ?? "inactive",
      connectedAt: input.connectedAt ?? null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    this.rows.set(row.id, row);
    return row;
  }

  async update(
    id: string,
    ownerId: string,
    changes: DataProviderConnectionUpdateInput,
  ): Promise<DataProviderConnection> {
    const row = await this.getByIdForOwner(id, ownerId);
    if (!row) throw new NotFoundError(`Data provider connection ${id} not found for owner ${ownerId}`);
    const updated = { ...row, ...changes, updatedAt: new Date() };
    this.rows.set(id, updated);
    return updated;
  }

  async softDelete(id: string, ownerId: string): Promise<void> {
    const row = this.rows.get(id);
    if (row && row.ownerId === ownerId) this.rows.set(id, { ...row, deletedAt: new Date() });
  }
}
