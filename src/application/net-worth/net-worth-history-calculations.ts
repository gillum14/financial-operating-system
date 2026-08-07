import type { Account, AccountType } from "@/domains/accounts/types";
import type { AccountBalanceSnapshot } from "@/domains/net-worth-history/types";

import { computeHistoricalNetWorthBreakdown, type NetWorthCategoryItem } from "./net-worth-breakdown";

// Pure calculation layer — no repository/DB dependency, trivially
// unit-testable with plain fixtures, same convention as goal-calculations.ts
// / budget-calculations.ts. All Net Worth *history* math lives here; the
// current-balance math stays in net-worth-breakdown.ts. Both share the
// same computeNetWorthBreakdownCore under the hood — see that file.

export interface NetWorthHistoryPoint {
  snapshotDate: string;
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
}

// One point per distinct snapshotDate present in the input, oldest first.
// Snapshot rows for the same date (one per account) are grouped and run
// through the same classification current Net Worth uses — there is no
// separate stored Net Worth aggregate to keep in sync with this.
export function computeNetWorthHistory(snapshots: AccountBalanceSnapshot[]): NetWorthHistoryPoint[] {
  const byDate = new Map<string, AccountBalanceSnapshot[]>();
  for (const snapshot of snapshots) {
    const bucket = byDate.get(snapshot.snapshotDate);
    if (bucket) {
      bucket.push(snapshot);
    } else {
      byDate.set(snapshot.snapshotDate, [snapshot]);
    }
  }

  return [...byDate.entries()]
    .map(([snapshotDate, rows]) => {
      const breakdown = computeHistoricalNetWorthBreakdown(rows);
      return {
        snapshotDate,
        netWorth: breakdown.netWorth,
        totalAssets: breakdown.totalAssets,
        totalLiabilities: breakdown.totalLiabilities,
      };
    })
    .sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate));
}

// The most recent historical point available — always the last element of
// an ascending-sorted history array, since every stored snapshot is
// already a completed date (monthly capture only ever snapshots a
// finished month; see lastDayOfPreviousMonth below). null when there is
// no history yet at all, which callers must render as an honest
// "unavailable" state — never a fabricated comparison.
export function selectComparisonPoint(history: NetWorthHistoryPoint[]): NetWorthHistoryPoint | null {
  return history.length > 0 ? history[history.length - 1] : null;
}

export interface NetWorthChange {
  comparisonDate: string;
  absoluteChange: number;
  percentChange: number | null;
}

// Generic so it covers netWorth, totalAssets, and totalLiabilities alike
// (Dashboard §8 needs all three; this is the one function all of them
// go through, so none can drift). percentChange is null (not 0, not
// Infinity) when the comparison value was exactly zero — a percentage
// off a zero base is undefined, not "no change." Callers must render
// that as honest "—", never 0%.
export function computeChange(current: number, comparisonValue: number, comparisonDate: string): NetWorthChange {
  const absoluteChange = current - comparisonValue;
  return {
    comparisonDate,
    absoluteChange,
    percentChange: comparisonValue !== 0 ? (absoluteChange / Math.abs(comparisonValue)) * 100 : null,
  };
}

export interface AccountBalanceChange {
  accountId: string;
  accountName: string;
  accountType: AccountType;
  currentBalance: number;
  comparisonBalance: number;
  absoluteChange: number;
}

// Per-account deltas since the comparison snapshot date, largest absolute
// change first — the data "Recent Changes" needs. An account with no row
// in comparisonSnapshots (opened after the comparison date) is correctly
// omitted rather than compared against a fabricated zero balance.
export function computeAccountBalanceChanges(
  accounts: Account[],
  comparisonSnapshots: AccountBalanceSnapshot[],
): AccountBalanceChange[] {
  const comparisonByAccountId = new Map(comparisonSnapshots.map((snapshot) => [snapshot.accountId, snapshot]));

  const changes: AccountBalanceChange[] = [];
  for (const account of accounts) {
    const comparison = comparisonByAccountId.get(account.id);
    if (!comparison) continue;

    const currentBalance = account.currentBalance ? Number(account.currentBalance) : 0;
    const comparisonBalance = Number(comparison.balance);
    changes.push({
      accountId: account.id,
      accountName: account.name,
      accountType: account.accountType,
      currentBalance,
      comparisonBalance,
      absoluteChange: currentBalance - comparisonBalance,
    });
  }

  return changes.sort((a, b) => Math.abs(b.absoluteChange) - Math.abs(a.absoluteChange));
}

export interface CategoryBalanceChange {
  accountType: AccountType;
  currentAmount: number;
  comparisonAmount: number;
  absoluteChange: number;
}

// Category-level change since the comparison date, keyed the same way
// assetsByCategory/liabilitiesByCategory already are (per accountType). A
// category with no prior row (e.g. a brand-new account type) compares
// against zero, which is correct here — unlike the account-level function
// above, "this category didn't exist in the comparison snapshot" really
// does mean its prior amount was zero, not "unknown."
export function computeCategoryChanges(
  current: NetWorthCategoryItem[],
  comparison: NetWorthCategoryItem[],
): CategoryBalanceChange[] {
  const comparisonByType = new Map(comparison.map((item) => [item.accountType, item.amount]));
  return current.map((item) => {
    const comparisonAmount = comparisonByType.get(item.accountType) ?? 0;
    return {
      accountType: item.accountType,
      currentAmount: item.amount,
      comparisonAmount,
      absoluteChange: item.amount - comparisonAmount,
    };
  });
}

// ---- Capture date helpers ---------------------------------------------
// Pure date math for SnapshotCaptureService — kept here (not inline in the
// service) so the boundary logic is unit-testable without a repository.

export function toDateOnlyString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// The last day of the calendar month BEFORE asOf's month — "the most
// recently completed month" relative to whenever this runs. Monthly
// capture always snapshots a finished month, never the in-progress one:
// day 0 of the current UTC month rolls back to the last day of the prior
// month, a standard, DST-safe way to express that in JS Date math.
export function lastDayOfPreviousMonth(asOf: Date): string {
  const year = asOf.getUTCFullYear();
  const month = asOf.getUTCMonth();
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}
