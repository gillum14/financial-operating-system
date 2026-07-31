import {
  TRANSACTION_TYPES,
  type NewTransaction,
  type Transaction,
  type TransactionType,
} from "@/db/schema/transactions";

export { TRANSACTION_TYPES };
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
