import type { CategorySpendItem, TransactionsSummary } from "@/application/transactions/transactions-views";

export type { CategorySpendItem };

// Presentation-shaped view model for the Reports overview, kept outside
// src/composition/ (server-only) so "use client" components can import
// this *type* without pulling in a composition-root module — same pattern
// as Transactions/Accounts/Budgets.
export interface ReportsOverviewView {
  // Real income/expense/net for the selected period — the exact same
  // computation Transactions uses (see spending-aggregation.ts), just run
  // over the Reports period filter instead of a Transactions list filter.
  summary: TransactionsSummary;
  // Share of income retained (net / income * 100), 0-100+ or negative.
  // Null when income is 0 for the period — dividing by zero isn't a real
  // rate, and showing 0% would misrepresent "no income" as "spent it all."
  savingsRate: number | null;
  // Real expense-only breakdown by category, same period as `summary`.
  categoryBreakdown: CategorySpendItem[];
}
