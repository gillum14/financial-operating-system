import { randomUUID } from "node:crypto";

import type { AccountRepository } from "@/domains/accounts/repository";
import type { Account, AccountCreateInput, AccountUpdateInput } from "@/domains/accounts/types";
import type { CategoryRepository } from "@/domains/categories/repository";
import type { Category, CategoryCreateInput, CategoryUpdateInput } from "@/domains/categories/types";
import type { DataProviderConnectionRepository } from "@/domains/data-provider-connections/repository";
import type {
  DataProviderConnection,
  DataProviderConnectionCreateInput,
  DataProviderConnectionUpdateInput,
} from "@/domains/data-provider-connections/types";
import { NotFoundError } from "@/domains/errors";
import type { InstitutionRepository } from "@/domains/institutions/repository";
import type { Institution, InstitutionCreateInput, InstitutionUpdateInput } from "@/domains/institutions/types";
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
