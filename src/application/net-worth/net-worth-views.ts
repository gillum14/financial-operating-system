import type { NetWorthCategoryItem } from "./net-worth-breakdown";

export type { NetWorthCategoryItem };

// Presentation-shaped view model for the Net Worth workspace, kept
// outside src/composition/ (server-only) so "use client" components can
// import this *type* without pulling in a composition-root module — same
// pattern as Transactions/Accounts/Budgets/Goals/Reports/Missions/
// Investments/Retirement.
export interface NetWorthOverviewView {
  // Real numbers — Net Worth/Total Assets/Total Liabilities are computed
  // from the owner's real active Accounts (see net-worth-breakdown.ts),
  // the same classification the Accounts workspace itself uses. NOT a
  // fabricated figure.
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  assetsByCategory: NetWorthCategoryItem[];
  liabilitiesByCategory: NetWorthCategoryItem[];
  // True once the owner has at least one active account — drives the
  // first-use empty state vs. the populated breakdown.
  hasAccounts: boolean;
}
