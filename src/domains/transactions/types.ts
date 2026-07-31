import type { NewTransaction, Transaction, TransactionType } from "@/db/schema/transactions";

export type { Transaction, TransactionType };

export type TransactionCreateInput = Omit<NewTransaction, "id" | "createdAt" | "updatedAt" | "deletedAt">;

export type TransactionUpdateInput = Partial<
  Omit<NewTransaction, "id" | "ownerId" | "accountId" | "createdAt" | "updatedAt" | "deletedAt">
>;

export type TransactionListFilter = {
  accountId?: string;
  categoryId?: string;
  dateFrom?: string;
  dateTo?: string;
  includeExcluded?: boolean;
};
