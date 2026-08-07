import "server-only";

import { computeHistoricalNetWorthBreakdown, computeNetWorthBreakdown } from "@/application/net-worth/net-worth-breakdown";
import {
  computeAccountBalanceChanges,
  computeCategoryChanges,
  computeChange,
  computeNetWorthHistory,
  selectComparisonPoint,
} from "@/application/net-worth/net-worth-history-calculations";
import type { NetWorthOverviewView } from "@/application/net-worth/net-worth-views";
import { db } from "@/db/client";
import { DrizzleAccountRepository } from "@/infrastructure/db/accounts-repository";
import { DrizzleAccountBalanceSnapshotRepository } from "@/infrastructure/db/net-worth-history-repository";

export type { NetWorthOverviewView };

// Server-only query orchestration for the Net Worth workspace — same role
// as accounts-query.ts, reusing the same repositories and the same real
// classification logic (net-worth-breakdown.ts / net-worth-history-
// calculations.ts) rather than a second, parallel computation that could
// quietly disagree with the Accounts page's numbers for the same
// accounts. This is also the ONE canonical source Dashboard's stat deltas
// consume (see dashboard-query.ts) — no duplicated delta math between the
// two pages.
const accountRepository = new DrizzleAccountRepository(db);
const snapshotRepository = new DrizzleAccountBalanceSnapshotRepository(db);

export async function getNetWorthOverview(ownerId: string): Promise<NetWorthOverviewView> {
  const [accounts, snapshots] = await Promise.all([
    accountRepository.listForOwner(ownerId, "active"),
    snapshotRepository.listForOwner(ownerId),
  ]);

  const breakdown = computeNetWorthBreakdown(accounts);
  const history = computeNetWorthHistory(snapshots);
  const comparisonPoint = selectComparisonPoint(history);

  if (!comparisonPoint) {
    return {
      ...breakdown,
      hasAccounts: accounts.length > 0,
      history,
      hasHistory: false,
      netWorthChange: null,
      totalAssetsChange: null,
      totalLiabilitiesChange: null,
      accountBalanceChanges: [],
      assetCategoryChanges: [],
      liabilityCategoryChanges: [],
    };
  }

  const comparisonSnapshots = snapshots.filter((snapshot) => snapshot.snapshotDate === comparisonPoint.snapshotDate);
  const comparisonBreakdown = computeHistoricalNetWorthBreakdown(comparisonSnapshots);

  return {
    ...breakdown,
    hasAccounts: accounts.length > 0,
    history,
    hasHistory: true,
    netWorthChange: computeChange(breakdown.netWorth, comparisonPoint.netWorth, comparisonPoint.snapshotDate),
    totalAssetsChange: computeChange(breakdown.totalAssets, comparisonPoint.totalAssets, comparisonPoint.snapshotDate),
    totalLiabilitiesChange: computeChange(
      breakdown.totalLiabilities,
      comparisonPoint.totalLiabilities,
      comparisonPoint.snapshotDate,
    ),
    accountBalanceChanges: computeAccountBalanceChanges(accounts, comparisonSnapshots),
    assetCategoryChanges: computeCategoryChanges(breakdown.assetsByCategory, comparisonBreakdown.assetsByCategory),
    liabilityCategoryChanges: computeCategoryChanges(
      breakdown.liabilitiesByCategory,
      comparisonBreakdown.liabilitiesByCategory,
    ),
  };
}
