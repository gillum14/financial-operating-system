import type { Account } from "@/domains/accounts/types";
import type { Category } from "@/domains/categories/types";
import type { Transaction, TransactionCursor } from "@/domains/transactions/types";

import { computeCategoryBreakdown, computeSpendingSummary } from "./spending-aggregation";
import type { TransactionListItem, TransactionsListView } from "./transactions-views";

// One page's worth of rows. Bounded and documented, per the
// implementation standard — not user-configurable in this slice.
export const TRANSACTIONS_PAGE_SIZE = 25;

export function encodeTransactionCursor(cursor: TransactionCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

export function decodeTransactionCursor(encoded: string): TransactionCursor | undefined {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as { transactionDate?: unknown }).transactionDate === "string" &&
      typeof (parsed as { id?: unknown }).id === "string"
    ) {
      return parsed as TransactionCursor;
    }
  } catch {
    // Malformed/tampered cursor — opaque cursors must fail safe. Treated
    // as "no cursor" (first page), never as an error.
  }
  return undefined;
}

// Pure shaping logic, deliberately separated from src/composition/
// transactions-query.ts's repository I/O — takes already-fetched rows and
// returns a presentation-ready view. This is what makes the view
// buildable in a unit test with plain arrays, no database, no fakes with
// query semantics to reimplement (mirrors accounts-summary.ts's split
// from accounts-query.ts).
export function buildTransactionsListView(input: {
  page: Transaction[]; // fetched with limit = TRANSACTIONS_PAGE_SIZE + 1
  summaryRows: Transaction[]; // unbounded, same filters as `page` minus limit/cursor
  totalCount: number; // real COUNT(*) over the same filters as `page`/`summaryRows`
  allAccounts: Account[]; // every non-deleted account, not just active — for name resolution
  categories: Category[];
}): TransactionsListView {
  const { page, summaryRows, totalCount, allAccounts, categories } = input;

  const hasMore = page.length > TRANSACTIONS_PAGE_SIZE;
  const items = page.slice(0, TRANSACTIONS_PAGE_SIZE);
  const lastItem = items[items.length - 1];
  const nextCursor =
    hasMore && lastItem ? encodeTransactionCursor({ transactionDate: lastItem.transactionDate, id: lastItem.id }) : null;

  const accountById = new Map(allAccounts.map((account) => [account.id, account]));
  const categoryNameById = new Map(categories.map((category) => [category.id, category.name]));

  const resolvedItems: TransactionListItem[] = items.map((transaction) => {
    const account = accountById.get(transaction.accountId);
    return {
      transaction,
      accountName: account?.name ?? "Unknown account",
      accountMaskedNumber: account?.maskedAccountNumber ?? null,
      categoryName: transaction.categoryId ? (categoryNameById.get(transaction.categoryId) ?? null) : null,
    };
  });

  return {
    items: resolvedItems,
    hasMore,
    nextCursor,
    totalCount,
    summary: computeSpendingSummary(summaryRows),
    categoryBreakdown: computeCategoryBreakdown(summaryRows, categoryNameById),
    accountOptions: allAccounts
      .filter((account) => account.status === "active")
      .map((account) => ({ id: account.id, name: account.name })),
    categoryOptions: categories.map((category) => ({ id: category.id, name: category.name })),
  };
}
