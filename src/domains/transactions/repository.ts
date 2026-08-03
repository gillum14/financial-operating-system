import type {
  Transaction,
  TransactionCreateInput,
  TransactionListFilter,
  TransactionUpdateInput,
} from "./types";

export interface TransactionRepository {
  getByIdForOwner(id: string, ownerId: string): Promise<Transaction | null>;
  listForOwner(ownerId: string, filter?: TransactionListFilter): Promise<Transaction[]>;
  // Total rows matching `filter` — ignores limit/cursor/sort (a count has
  // no page or order), everything else applies identically to listForOwner.
  countForOwner(ownerId: string, filter?: TransactionListFilter): Promise<number>;
  create(input: TransactionCreateInput): Promise<Transaction>;
  update(id: string, ownerId: string, changes: TransactionUpdateInput): Promise<Transaction>;
  softDelete(id: string, ownerId: string): Promise<void>;
}
