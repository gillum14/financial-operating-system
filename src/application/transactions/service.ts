import { z } from "zod";

import type { AccountRepository } from "@/domains/accounts/repository";
import type { CategoryRepository } from "@/domains/categories/repository";
import { NotFoundError, ValidationError } from "@/domains/errors";
import type { TransactionRepository } from "@/domains/transactions/repository";
import { TRANSACTION_TYPES } from "@/domains/transactions/types";
import type {
  Transaction,
  TransactionCreateInput,
  TransactionListFilter,
  TransactionUpdateInput,
} from "@/domains/transactions/types";

const moneyStringSchema = z
  .string()
  .regex(/^-?\d+(\.\d{1,4})?$/, "Must be a decimal amount with up to 4 places");
const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a YYYY-MM-DD date");

const createTransactionSchema = z.object({
  ownerId: z.string().uuid(),
  accountId: z.string().uuid(),
  categoryId: z.string().uuid().optional().nullable(),
  transactionDate: dateStringSchema,
  postingDate: dateStringSchema.optional(),
  originalDescription: z.string().trim().min(1).max(500),
  merchant: z.string().trim().max(200).optional(),
  amount: moneyStringSchema,
  transactionType: z.enum(TRANSACTION_TYPES),
  isExcluded: z.boolean().optional(),
  notes: z.string().max(2000).optional(),
});

const updateTransactionSchema = createTransactionSchema.omit({ ownerId: true, accountId: true }).partial();

export class TransactionService {
  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly accountRepository: AccountRepository,
    private readonly categoryRepository: CategoryRepository,
  ) {}

  async createTransaction(input: TransactionCreateInput): Promise<Transaction> {
    const parsed = createTransactionSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.message);
    }

    const account = await this.accountRepository.getByIdForOwner(parsed.data.accountId, parsed.data.ownerId);
    if (!account) {
      throw new NotFoundError(`Account ${parsed.data.accountId} not found for this owner`);
    }

    if (parsed.data.categoryId) {
      await this.assertOwnedCategory(parsed.data.categoryId, parsed.data.ownerId);
    }

    return this.transactionRepository.create(parsed.data);
  }

  async listTransactions(ownerId: string, filter?: TransactionListFilter): Promise<Transaction[]> {
    return this.transactionRepository.listForOwner(ownerId, filter);
  }

  async getTransaction(id: string, ownerId: string): Promise<Transaction | null> {
    return this.transactionRepository.getByIdForOwner(id, ownerId);
  }

  async updateTransaction(id: string, ownerId: string, changes: TransactionUpdateInput): Promise<Transaction> {
    const parsed = updateTransactionSchema.safeParse(changes);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.message);
    }

    if (parsed.data.categoryId) {
      await this.assertOwnedCategory(parsed.data.categoryId, ownerId);
    }

    return this.transactionRepository.update(id, ownerId, parsed.data);
  }

  async deleteTransaction(id: string, ownerId: string): Promise<void> {
    await this.transactionRepository.softDelete(id, ownerId);
  }

  private async assertOwnedCategory(categoryId: string, ownerId: string): Promise<void> {
    const category = await this.categoryRepository.getByIdForOwner(categoryId, ownerId);
    if (!category) {
      throw new NotFoundError(`Category ${categoryId} not found for this owner`);
    }
  }
}
