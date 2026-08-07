import type { Transaction } from "@/domains/transactions/types";

// Shared by Transactions' summary tiles/breakdown AND the Reports
// overview (src/composition/reports-query.ts) — one definition of "income
// total," "spending total," and "category breakdown," so the two pages
// can never silently disagree about what those words mean.

export interface SpendingSummary {
  income: number;
  expenses: number;
  net: number;
}

export interface CategorySpendItem {
  categoryId: string | null;
  categoryName: string;
  amount: number;
  // Share of total spend in the given row set, 0-100. Percentages across
  // the array sum to ~100 (rounding aside) because a trailing "Other"
  // entry absorbs every category past the top 6, rather than the list
  // silently under-accounting for the rest of real spend.
  percent: number;
}

// Categories beyond this rank fold into a trailing "Other" entry — same
// cap as the chart-1..6 palette used to color them, and consistent with
// never generating an unbounded, hard-to-scan legend.
const CATEGORY_BREAKDOWN_LIMIT = 6;

// Income/expense presentation, not net worth: transfers are excluded from
// both sides, matching the domain invariant that internal transfers must
// not inflate income or spending.
export function computeSpendingSummary(rows: Transaction[]): SpendingSummary {
  let income = 0;
  let expenses = 0;
  for (const transaction of rows) {
    const amount = Number(transaction.amount);
    if (transaction.transactionType === "income") {
      income += amount;
    } else if (transaction.transactionType === "expense") {
      expenses += Math.abs(amount);
    }
  }
  return { income, expenses, net: income - expenses };
}

export function computeCategoryBreakdown(rows: Transaction[], categoryNameById: Map<string, string>): CategorySpendItem[] {
  const spendByCategory = new Map<string, number>();
  for (const transaction of rows) {
    if (transaction.transactionType !== "expense") continue;
    const key = transaction.categoryId ?? "uncategorized";
    spendByCategory.set(key, (spendByCategory.get(key) ?? 0) + Math.abs(Number(transaction.amount)));
  }

  const totalSpend = [...spendByCategory.values()].reduce((sum, amount) => sum + amount, 0);
  if (totalSpend === 0) return [];

  const sorted = [...spendByCategory.entries()].sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, CATEGORY_BREAKDOWN_LIMIT);
  const rest = sorted.slice(CATEGORY_BREAKDOWN_LIMIT);
  const restTotal = rest.reduce((sum, [, amount]) => sum + amount, 0);

  const breakdown: CategorySpendItem[] = top.map(([key, amount]) => ({
    categoryId: key === "uncategorized" ? null : key,
    categoryName: key === "uncategorized" ? "Uncategorized" : (categoryNameById.get(key) ?? "Uncategorized"),
    amount,
    percent: (amount / totalSpend) * 100,
  }));

  if (restTotal > 0) {
    breakdown.push({ categoryId: null, categoryName: "Other", amount: restTotal, percent: (restTotal / totalSpend) * 100 });
  }

  return breakdown;
}

// Shared with the Budgets domain (src/application/budgets/) for a
// category's actual spending within a period — a sibling to
// computeCategoryBreakdown above rather than a second definition of
// "spending." Differs from computeCategoryBreakdown in exactly one way:
// this nets income-typed rows against expense-typed rows in the *same*
// category instead of only summing expenses, because refunds have no
// distinct transaction type in this schema (see transactions.ts) — a
// refund is modeled as an income row filed under the same category as the
// purchase it reverses (the seed data's own convention), so netting
// income against expense per category is how refunds get "handled
// correctly" without inventing a refund concept the Transactions domain
// itself doesn't have.
//
// Transfers are excluded by the same implicit income/expense-only branch
// as computeSpendingSummary. Uncategorized rows (categoryId: null) are
// dropped entirely — they can never match a specific budget allocation's
// categoryId, so they must never silently count toward one. Callers are
// responsible for excluding isExcluded transactions upstream (via the
// repository's includeExcluded: false default), exactly as every other
// caller of this file already does.
export function computeCategorySpendForPeriod(rows: Transaction[]): Map<string, number> {
  const spendByCategory = new Map<string, number>();
  for (const transaction of rows) {
    if (!transaction.categoryId) continue;
    const amount = Number(transaction.amount);
    let delta: number;
    if (transaction.transactionType === "expense") {
      delta = Math.abs(amount);
    } else if (transaction.transactionType === "income") {
      delta = -Math.abs(amount);
    } else {
      continue;
    }
    spendByCategory.set(transaction.categoryId, (spendByCategory.get(transaction.categoryId) ?? 0) + delta);
  }
  return spendByCategory;
}
