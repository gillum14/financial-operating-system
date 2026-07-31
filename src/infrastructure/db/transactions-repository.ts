import { and, eq, gte, isNull, lte, type SQLWrapper } from "drizzle-orm";

import type { DbClient } from "@/db/client";
import { transactions } from "@/db/schema";
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

  async listForOwner(ownerId: string, filter?: TransactionListFilter): Promise<Transaction[]> {
    const conditions: SQLWrapper[] = [eq(transactions.ownerId, ownerId), isNull(transactions.deletedAt)];

    if (filter?.accountId) {
      conditions.push(eq(transactions.accountId, filter.accountId));
    }
    if (filter?.categoryId) {
      conditions.push(eq(transactions.categoryId, filter.categoryId));
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

    return this.db
      .select()
      .from(transactions)
      .where(and(...conditions));
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
      throw new Error(`Transaction ${id} not found for owner ${ownerId}`);
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
