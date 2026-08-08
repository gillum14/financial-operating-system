import { and, asc, count, desc, eq, gt, gte, ilike, isNull, lt, lte, or, type SQLWrapper } from "drizzle-orm";

import type { DbClient } from "@/db/client";
import { transactions } from "@/db/schema";
import { NotFoundError } from "@/domains/errors";
import type { TransactionRepository } from "@/domains/transactions/repository";
import type {
  Transaction,
  TransactionCreateInput,
  TransactionListFilter,
  TransactionUpdateInput,
} from "@/domains/transactions/types";

export class DrizzleTransactionRepository implements TransactionRepository {
  constructor(private readonly db: DbClient) {}

  async getByIdForOwner(id: string, ownerId: string): Promise<Transaction | null> {
    const [row] = await this.db
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.ownerId, ownerId), isNull(transactions.deletedAt)))
      .limit(1);
    return row ?? null;
  }

  // Shared by listForOwner and countForOwner — cursor is deliberately
  // excluded here (a count has no page, and mixing it in would silently
  // undercount) and applied only in listForOwner.
  private buildFilterConditions(ownerId: string, filter?: TransactionListFilter): SQLWrapper[] {
    const conditions: SQLWrapper[] = [eq(transactions.ownerId, ownerId), isNull(transactions.deletedAt)];

    if (filter?.accountId) {
      conditions.push(eq(transactions.accountId, filter.accountId));
    }
    if (filter?.categoryId) {
      conditions.push(eq(transactions.categoryId, filter.categoryId));
    }
    if (filter?.uncategorizedOnly) {
      conditions.push(isNull(transactions.categoryId));
    }
    if (filter?.transactionType) {
      conditions.push(eq(transactions.transactionType, filter.transactionType));
    }
    if (filter?.dateFrom) {
      conditions.push(gte(transactions.transactionDate, filter.dateFrom));
    }
    if (filter?.dateTo) {
      conditions.push(lte(transactions.transactionDate, filter.dateTo));
    }
    if (!filter?.includeExcluded) {
      conditions.push(eq(transactions.isExcluded, false));
    }
    if (filter?.search) {
      const pattern = `%${filter.search}%`;
      conditions.push(or(ilike(transactions.originalDescription, pattern), ilike(transactions.merchant, pattern))!);
    }

    return conditions;
  }

  async listForOwner(ownerId: string, filter?: TransactionListFilter): Promise<Transaction[]> {
    const conditions = this.buildFilterConditions(ownerId, filter);
    const direction = filter?.sort ?? "desc";

    // Keyset pagination on the same (transactionDate, id) tuple as the
    // sort order below: rows strictly "after" the cursor row in whichever
    // direction is active. A cursor from a desc page must never be
    // combined with an asc fetch (or vice versa) — the comparison
    // operators are direction-specific.
    if (filter?.cursor) {
      const { transactionDate, id } = filter.cursor;
      const dateCompare = direction === "asc" ? gt : lt;
      const idCompare = direction === "asc" ? gt : lt;
      conditions.push(
        or(
          dateCompare(transactions.transactionDate, transactionDate),
          and(eq(transactions.transactionDate, transactionDate), idCompare(transactions.id, id)),
        )!,
      );
    }

    const orderFn = direction === "asc" ? asc : desc;
    const query = this.db
      .select()
      .from(transactions)
      .where(and(...conditions))
      // Stable, deterministic order: date first (what users actually scan
      // by), id as a tie-breaker for rows sharing a date — required for
      // keyset pagination to never skip or repeat a row.
      .orderBy(orderFn(transactions.transactionDate), orderFn(transactions.id));

    return filter?.limit ? query.limit(filter.limit) : query;
  }

  async countForOwner(ownerId: string, filter?: TransactionListFilter): Promise<number> {
    const conditions = this.buildFilterConditions(ownerId, filter);
    const [row] = await this.db
      .select({ value: count() })
      .from(transactions)
      .where(and(...conditions));
    return row?.value ?? 0;
  }

  async create(input: TransactionCreateInput): Promise<Transaction> {
    const [row] = await this.db.insert(transactions).values(input).returning();
    return row;
  }

  async update(id: string, ownerId: string, changes: TransactionUpdateInput): Promise<Transaction> {
    const [row] = await this.db
      .update(transactions)
      .set({ ...changes, updatedAt: new Date() })
      .where(and(eq(transactions.id, id), eq(transactions.ownerId, ownerId), isNull(transactions.deletedAt)))
      .returning();

    if (!row) {
      throw new NotFoundError(`Transaction ${id} not found for owner ${ownerId}`);
    }

    return row;
  }

  async softDelete(id: string, ownerId: string): Promise<void> {
    await this.db
      .update(transactions)
      .set({ deletedAt: new Date() })
      .where(and(eq(transactions.id, id), eq(transactions.ownerId, ownerId)));
  }
}
