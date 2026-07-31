import type { AccountType } from "@/domains/accounts/types";
import type { ActivityItem, CashFlowPoint, CategorySpend } from "@/features/dashboard/types";

import type { AccountDisplayGroup } from "./account-presentation";

// Adapter-native account view: the existing dashboard Account type only has
// 4 categories, too narrow for the real 12-value AccountType. This preserves
// the canonical schema type and adds presentation fields alongside it,
// rather than lossily collapsing real data into an inaccurate bucket.
export interface DashboardAccountView {
  id: string;
  name: string;
  institution: string | null;
  accountType: AccountType;
  displayGroup: AccountDisplayGroup;
  displayLabel: string;
  balance: number;
}

// Adapter-native stat snapshot: the existing dashboard StatSummary type
// requires a delta ("+2.01% vs last 30 days"), which isn't honestly
// computable without historical balance snapshots that don't exist yet.
// This carries the current value only — no fabricated comparison.
export interface DashboardStatSnapshot {
  label: string;
  value: number;
  caption: string;
}

export interface DashboardSnapshot {
  accounts: DashboardAccountView[];
  recentActivity: ActivityItem[];
  spendingByCategory: CategorySpend[];
  spendingTotal: number;
  cashFlowSeries: CashFlowPoint[];
  netWorth: DashboardStatSnapshot;
  monthlyCashFlow: DashboardStatSnapshot;
  investments: DashboardStatSnapshot;
}
