import type { NetWorthCategoryItem } from "./net-worth-breakdown";
import type {
  AccountBalanceChange,
  CategoryBalanceChange,
  NetWorthChange,
  NetWorthHistoryPoint,
} from "./net-worth-history-calculations";

export type { AccountBalanceChange, CategoryBalanceChange, NetWorthCategoryItem, NetWorthChange, NetWorthHistoryPoint };

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

  // Historical Net Worth series, derived from immutable
  // account_balance_snapshots rows (see net-worth-history-calculations.ts)
  // — oldest first, one point per distinct snapshot date. Empty until the
  // owner's first snapshot exists; NEVER back-filled from current
  // balances.
  history: NetWorthHistoryPoint[];
  // True once at least one historical snapshot exists — drives the
  // Net Worth Over Time chart's real-data vs. "history unavailable" state.
  hasHistory: boolean;

  // Deltas vs. the most recent available historical snapshot (see
  // selectComparisonPoint) — null whenever hasHistory is false, which
  // callers must render as an honest unavailable state, never a
  // fabricated 0% or "vs last 30 days" caption that doesn't match the
  // real comparison date.
  netWorthChange: NetWorthChange | null;
  totalAssetsChange: NetWorthChange | null;
  totalLiabilitiesChange: NetWorthChange | null;

  // Per-account and per-category deltas since the same comparison point
  // — empty arrays (not null) when there's no comparison point, since an
  // empty list already renders an honest empty state.
  accountBalanceChanges: AccountBalanceChange[];
  assetCategoryChanges: CategoryBalanceChange[];
  liabilityCategoryChanges: CategoryBalanceChange[];
}
