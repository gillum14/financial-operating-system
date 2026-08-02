import type { AccountDisplayGroup } from "@/application/dashboard/account-presentation";
import type { Account } from "@/domains/accounts/types";

import type { AccountsSummary } from "./accounts-summary";

// Presentation-shaped view models for the Accounts workspace UI, kept
// deliberately outside src/composition/ (server-only) so "use client"
// components can import these *types* without pulling in a composition-root
// module — see the architecture-boundaries.test.ts rule this satisfies.
// The functions that actually produce these shapes stay server-only, in
// src/composition/accounts-query.ts.

export interface AccountListRow {
  account: Account;
  institutionName: string | null;
  displayGroup: AccountDisplayGroup;
  displayLabel: string;
}

export interface AccountsListView {
  rows: AccountListRow[];
  groupOrder: AccountDisplayGroup[];
  groups: Partial<Record<AccountDisplayGroup, AccountListRow[]>>;
  summary: AccountsSummary;
}

export interface AccountActivityItem {
  id: string;
  merchant: string;
  categoryName: string | null;
  amount: number;
  transactionDate: string;
}

export interface AccountDetailView {
  account: Account;
  institutionName: string | null;
  displayGroup: AccountDisplayGroup;
  displayLabel: string;
  activity: AccountActivityItem[];
}

export interface InstitutionOption {
  id: string;
  name: string;
}
