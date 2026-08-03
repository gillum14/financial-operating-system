import "server-only";

import { buildTransactionsListView, decodeTransactionCursor, TRANSACTIONS_PAGE_SIZE } from "@/application/transactions/transactions-list-view";
import type {
  TransactionFilterOption,
  TransactionListItem,
  TransactionsListView,
  TransactionsQueryParams,
} from "@/application/transactions/transactions-views";
import { db } from "@/db/client";
import type { TransactionListFilter } from "@/domains/transactions/types";
import { DrizzleAccountRepository } from "@/infrastructure/db/accounts-repository";
import { DrizzleCategoryRepository } from "@/infrastructure/db/categories-repository";
import { DrizzleTransactionRepository } from "@/infrastructure/db/transactions-repository";

export type { TransactionFilterOption, TransactionListItem, TransactionsListView, TransactionsQueryParams };

// Server-only query orchestration for the Transactions workspace — same
// role as accounts-query.ts / dashboard-query.ts. Fetches rows via the
// repositories, then hands them to the pure buildTransactionsListView()
// (src/application/transactions/transactions-list-view.ts) to shape into
// a presentation-ready view. No JSX, no try/catch; errors propagate to
// the route's error boundary.

const accountRepository = new DrizzleAccountRepository(db);
const categoryRepository = new DrizzleCategoryRepository(db);
const transactionRepository = new DrizzleTransactionRepository(db);

function buildFilter(params: TransactionsQueryParams): Omit<TransactionListFilter, "limit" | "cursor"> {
  return {
    accountId: params.accountId || undefined,
    categoryId: params.categoryId || undefined,
    transactionType: params.transactionType || undefined,
    dateFrom: params.dateFrom || undefined,
    dateTo: params.dateTo || undefined,
    search: params.search || undefined,
    sort: params.sort,
  };
}

export async function getTransactionsListView(
  ownerId: string,
  params: TransactionsQueryParams,
): Promise<TransactionsListView> {
  const baseFilter = buildFilter(params);
  const cursor = params.cursor ? decodeTransactionCursor(params.cursor) : undefined;

  const [page, summaryRows, totalCount, allAccounts, categories] = await Promise.all([
    // Request one extra row to detect "is there a next page" — cheaper
    // and immune to any race with the separate count query below, which
    // exists purely for display ("1,234 transactions"), not for
    // pagination correctness.
    transactionRepository.listForOwner(ownerId, { ...baseFilter, cursor, limit: TRANSACTIONS_PAGE_SIZE + 1 }),
    // Unbounded, but scoped by the same filters (including any date
    // range) — the caller is expected to default the date range so this
    // isn't an unbounded full-history scan by default. See the
    // Transactions page for that default.
    transactionRepository.listForOwner(ownerId, baseFilter),
    transactionRepository.countForOwner(ownerId, baseFilter),
    accountRepository.listForOwner(ownerId),
    categoryRepository.listForOwner(ownerId),
  ]);

  return buildTransactionsListView({ page, summaryRows, totalCount, allAccounts, categories });
}
