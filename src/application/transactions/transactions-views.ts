import type { Transaction, TransactionType } from "@/domains/transactions/types";

import type { CategorySpendItem, SpendingSummary } from "./spending-aggregation";

// Presentation-shaped view models for the Transactions workspace UI, kept
// outside src/composition/ (server-only) so "use client" components can
// import these *types* without pulling in a composition-root module — see
// architecture-boundaries.test.ts and the identical pattern already used
// for Accounts (src/application/accounts/accounts-views.ts).

export interface TransactionListItem {
  transaction: Transaction;
  accountName: string;
  accountMaskedNumber: string | null;
  categoryName: string | null;
}

// TransactionsSummary/CategorySpendItem are re-exported (not redefined)
// from spending-aggregation.ts — that module owns the one real
// income/expense/category-breakdown computation, shared with the Reports
// overview, so this file can't drift into a second, subtly different
// definition of the same numbers.
export type TransactionsSummary = SpendingSummary;
export type { CategorySpendItem };

export interface TransactionFilterOption {
  id: string;
  name: string;
}

export interface TransactionsListView {
  items: TransactionListItem[];
  hasMore: boolean;
  nextCursor: string | null;
  // Total rows matching the active filters — a real COUNT, not an
  // estimate. Independent of pagination (counts every matching row, not
  // just the current page).
  totalCount: number;
  // Computed over every transaction matching the active filters (not just
  // the current page) — see getTransactionsListView for the bounding
  // caveat this depends on.
  summary: TransactionsSummary;
  // Expense-only breakdown by category, same filter window as `summary`.
  // Sorted descending by amount, capped at 6 real categories plus a
  // trailing "Other" bucket for the remainder — never a fabricated
  // period-over-period comparison, since only one period is ever fetched.
  categoryBreakdown: CategorySpendItem[];
  accountOptions: TransactionFilterOption[];
  categoryOptions: TransactionFilterOption[];
}

export type TransactionSortDirection = "asc" | "desc";

export interface TransactionsQueryParams {
  accountId?: string;
  categoryId?: string;
  transactionType?: TransactionType;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  // Opaque, obtained only from a previous TransactionsListView.nextCursor.
  cursor?: string;
  // Defaults to "desc" (most recent first) when omitted.
  sort?: TransactionSortDirection;
}
