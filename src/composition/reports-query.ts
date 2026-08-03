import "server-only";

import { computeCategoryBreakdown, computeSpendingSummary } from "@/application/transactions/spending-aggregation";
import type { ReportsOverviewView } from "@/application/reports/reports-views";
import { db } from "@/db/client";
import { DrizzleCategoryRepository } from "@/infrastructure/db/categories-repository";
import { DrizzleTransactionRepository } from "@/infrastructure/db/transactions-repository";

export type { ReportsOverviewView };

// Server-only query orchestration for the Reports workspace — same role
// as transactions-query.ts, reusing the exact same repositories and the
// exact same shared income/expense/category-breakdown math (
// spending-aggregation.ts) rather than a second, parallel computation
// that could quietly disagree with Transactions' numbers for the same
// period.
//
// TECH DEBT: this only computes what's honestly derivable from a single
// unbounded fetch of the period's transactions — one period, no
// comparison to a prior period, no weekly/monthly bucketing. See the
// Reports page's Cash Flow and Monthly Trend cards, which render honest
// placeholders rather than fabricate that shape of data.
const categoryRepository = new DrizzleCategoryRepository(db);
const transactionRepository = new DrizzleTransactionRepository(db);

export async function getReportsOverview(
  ownerId: string,
  period: { dateFrom?: string; dateTo?: string },
): Promise<ReportsOverviewView> {
  const [rows, categories] = await Promise.all([
    transactionRepository.listForOwner(ownerId, period),
    categoryRepository.listForOwner(ownerId),
  ]);

  const categoryNameById = new Map(categories.map((category) => [category.id, category.name]));
  const summary = computeSpendingSummary(rows);
  const categoryBreakdown = computeCategoryBreakdown(rows, categoryNameById);
  const savingsRate = summary.income > 0 ? (summary.net / summary.income) * 100 : null;

  return { summary, savingsRate, categoryBreakdown };
}
