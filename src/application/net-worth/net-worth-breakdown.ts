import { getAccountPresentation } from "@/application/dashboard/account-presentation";
import type { Account, AccountType } from "@/domains/accounts/types";
import type { AccountBalanceSnapshot } from "@/domains/net-worth-history/types";

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
// like) — reused directly (not via summarizeAccounts, so this file has no
// dependency on the Accounts domain's own summary type) for the three
// top-line numbers, so this page's Net Worth/Total Assets/Total
// Liabilities can never drift from what the Accounts workspace itself
// reports for the same accounts.
const LIABILITY_GROUPS = new Set(["Credit", "Loans"]);

// The minimal shape both a live Account and a historical
// AccountBalanceSnapshot can be reduced to for classification purposes —
// this is the ONE place account-type-vs-balance math happens for Net
// Worth, current or historical. Do not duplicate this loop elsewhere;
// add a new thin mapping wrapper below instead.
interface NetWorthLineItem {
  accountType: AccountType;
  balance: number;
}

function computeNetWorthBreakdownCore(items: NetWorthLineItem[]): NetWorthBreakdown {
  let totalAssets = 0;
  let totalLiabilities = 0;
  const assetAmounts = new Map<AccountType, number>();
  const liabilityAmounts = new Map<AccountType, number>();

  for (const item of items) {
    const { group } = getAccountPresentation(item.accountType);
    const magnitude = Math.abs(item.balance);

    if (LIABILITY_GROUPS.has(group)) {
      totalLiabilities += magnitude;
      liabilityAmounts.set(item.accountType, (liabilityAmounts.get(item.accountType) ?? 0) + magnitude);
    } else {
      // Assets accumulate the raw (signed) balance, not the magnitude —
      // an overdrawn asset-like account should reduce total assets, not
      // inflate it. Category display amounts below still use magnitude,
      // matching the pre-existing "You Have" convention.
      totalAssets += item.balance;
      assetAmounts.set(item.accountType, (assetAmounts.get(item.accountType) ?? 0) + magnitude);
    }
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
    netWorth: totalAssets - totalLiabilities,
    totalAssets,
    totalLiabilities,
    assetsByCategory: toCategoryItems(assetAmounts, totalAssets),
    liabilitiesByCategory: toCategoryItems(liabilityAmounts, totalLiabilities),
  };
}

export function computeNetWorthBreakdown(accounts: Account[]): NetWorthBreakdown {
  return computeNetWorthBreakdownCore(
    accounts.map((account) => ({
      accountType: account.accountType,
      balance: account.currentBalance ? Number(account.currentBalance) : 0,
    })),
  );
}

// Same computation, fed from immutable historical snapshot rows instead
// of live accounts — the snapshot's own denormalized accountType/balance
// are used (never a join back to the live `accounts` table), so this
// produces the exact totals that existed on snapshotDate even if an
// account has since changed type or been archived. This is the only Net
// Worth calculation path for history; there is no separate stored
// aggregate to keep in sync with it.
export function computeHistoricalNetWorthBreakdown(snapshots: AccountBalanceSnapshot[]): NetWorthBreakdown {
  return computeNetWorthBreakdownCore(
    snapshots.map((snapshot) => ({
      accountType: snapshot.accountType,
      balance: Number(snapshot.balance),
    })),
  );
}
