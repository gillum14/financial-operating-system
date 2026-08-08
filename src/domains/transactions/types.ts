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
  // categoryId IS NULL — mutually exclusive with categoryId above (a
  // caller filtering to a specific category can never also mean "and has
  // no category"). Added for the Mission Engine's categorize-transactions
  // mission, but not Missions-specific — it's a plain, reusable
  // Transactions-domain filter, the same as every other field here.
  uncategorizedOnly?: boolean;
  transactionType?: TransactionType;
  dateFrom?: string;
  dateTo?: string;
  includeExcluded?: boolean;
  // Case-insensitive substring match against originalDescription OR
  // merchant. Bounded/parameterized at the repository layer — never raw
  // SQL built from this value.
  search?: string;
  // Keyset pagination. Both optional and additive: omitting them
  // preserves every existing caller's unbounded-list behavior exactly.
  // `cursor` is opaque to callers — obtained from a previous page's last
  // row, never constructed by hand.
  limit?: number;
  cursor?: TransactionCursor;
  // Defaults to "desc" (most recent first). Affects both the ORDER BY
  // and which direction a cursor moves — a page fetched with one sort
  // direction is not safely combined with a cursor from the other.
  sort?: "asc" | "desc";
};

// Composite keyset cursor: (transactionDate, id) matches the stable sort
// order (transactionDate DESC, id DESC) — a single-column date cursor
// would be ambiguous whenever two transactions share a date.
export type TransactionCursor = {
  transactionDate: string;
  id: string;
};
