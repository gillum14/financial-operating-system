import { getAccountPresentation } from "@/application/dashboard/account-presentation";
import { summarizeAccounts } from "@/application/accounts/accounts-summary";
import type { Account, AccountType } from "@/domains/accounts/types";

export interface NetWorthCategoryItem {
  accountType: AccountType;
  label: string;
  amount: number;
  // Share of that side's own total (assets sum to 100% across
  // assetsByCategory; liabilities sum to 100% across
  // liabilitiesByCategory) — not a share of net worth. The approved
  // mockup's own percentages don't cleanly reconcile to either total
  // (they sum closer to net worth than to total assets), so rather than
  // guess at intent from inconsistent mockup numbers, this picks the one
  // internally-consistent framing: each side's categories sum to that
  // side's own real total.
  percent: number;
}

export interface NetWorthBreakdown {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  assetsByCategory: NetWorthCategoryItem[];
  liabilitiesByCategory: NetWorthCategoryItem[];
}

// Same liability classification accounts-summary.ts already uses (Credit
// and Loans display-groups are liabilities, everything else is asset-
// like) — reused via summarizeAccounts() for the three top-line numbers,
// so this page's Net Worth/Total Assets/Total Liabilities can never drift
// from what the Accounts workspace itself reports for the same accounts.
const LIABILITY_GROUPS = new Set(["Credit", "Loans"]);

export function computeNetWorthBreakdown(accounts: Account[]): NetWorthBreakdown {
  const { youHave: totalAssets, youOwe: totalLiabilities, difference: netWorth } = summarizeAccounts(accounts);

  const assetAmounts = new Map<AccountType, number>();
  const liabilityAmounts = new Map<AccountType, number>();

  for (const account of accounts) {
    const balance = account.currentBalance ? Number(account.currentBalance) : 0;
    const { group } = getAccountPresentation(account.accountType);
    const bucket = LIABILITY_GROUPS.has(group) ? liabilityAmounts : assetAmounts;
    bucket.set(account.accountType, (bucket.get(account.accountType) ?? 0) + Math.abs(balance));
  }

  const toCategoryItems = (amounts: Map<AccountType, number>, total: number): NetWorthCategoryItem[] =>
    [...amounts.entries()]
      .map(([accountType, amount]) => ({
        accountType,
        label: getAccountPresentation(accountType).label,
        amount,
        percent: total > 0 ? (amount / total) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

  return {
    netWorth,
    totalAssets,
    totalLiabilities,
    assetsByCategory: toCategoryItems(assetAmounts, totalAssets),
    liabilitiesByCategory: toCategoryItems(liabilityAmounts, totalLiabilities),
  };
}
