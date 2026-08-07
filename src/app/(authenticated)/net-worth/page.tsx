import { getNetWorthOverview } from "@/composition/net-worth-query";
import { requireAuthenticatedUser } from "@/lib/auth/authenticated-user";
import type { AccountBalanceChange, NetWorthCategoryItem } from "@/application/net-worth/net-worth-views";
import { NetWorthBreakdownCard } from "@/features/net-worth/components/net-worth-breakdown-card";
import { NetWorthCategoryListCard } from "@/features/net-worth/components/net-worth-category-list-card";
import { NetWorthHeader } from "@/features/net-worth/components/net-worth-header";
import { NetWorthInsightsPanel } from "@/features/net-worth/components/net-worth-insights-panel";
import { NetWorthOverTimeCard } from "@/features/net-worth/components/net-worth-over-time-card";
import { NetWorthProgressCard } from "@/features/net-worth/components/net-worth-progress-card";
import { NetWorthSummaryMetrics } from "@/features/net-worth/components/net-worth-summary-metrics";
import { RecentChangesCard } from "@/features/net-worth/components/recent-changes-card";
import { RAIL_GRID_COLS } from "@/lib/page-grid";

// Live, per-owner data resolved at request time — must never be statically
// prerendered or cached across owners (same rule as Dashboard/Accounts/
// Transactions/Budgets/Goals/Reports/Missions/Investments/Retirement).
export const dynamic = "force-dynamic";

// The rail's 3 cards, rendered once per breakpoint mode (desktop `aside`,
// stacked-below-threshold block) below — kept as one function so the two
// render sites can't drift out of sync with each other. Same pattern as
// Budgets'/Goals'/Missions'/Investments'/Retirement's RailCards.
function RailCards({
  netWorth,
  totalLiabilities,
  assetsByCategory,
  hasAccounts,
  accountBalanceChanges,
}: {
  netWorth: number;
  totalLiabilities: number;
  assetsByCategory: NetWorthCategoryItem[];
  hasAccounts: boolean;
  accountBalanceChanges: AccountBalanceChange[];
}) {
  return (
    <>
      <NetWorthBreakdownCard
        netWorth={netWorth}
        totalLiabilities={totalLiabilities}
        assetsByCategory={assetsByCategory}
        hasAccounts={hasAccounts}
      />
      <NetWorthProgressCard />
      <RecentChangesCard changes={accountBalanceChanges} />
    </>
  );
}

export default async function NetWorthPage() {
  const authUser = await requireAuthenticatedUser();
  const overview = await getNetWorthOverview(authUser.id);

  return (
    // overflow-x-hidden + min-w-0: same containment boundary established
    // on Transactions/Budgets/Goals/Missions/Investments/Retirement — a
    // wide descendant must never be able to inflate
    // document.body.scrollWidth past the viewport on narrow screens.
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      <NetWorthHeader />

      {/* DEVIATION FROM SIBLING PAGES: the approved mockup has no tab
          strip at all (unlike Budgets/Goals/Missions/Investments/
          Retirement, which all have an Overview + disabled-tabs row) — it
          goes straight from the header to the metrics row. Per the UI
          standard ("approved mockups are implementation targets, not
          inspiration"), this page omits the tabs component rather than
          adding one the design doesn't call for. */}
      <NetWorthSummaryMetrics
        netWorth={overview.netWorth}
        totalAssets={overview.totalAssets}
        totalLiabilities={overview.totalLiabilities}
        hasAccounts={overview.hasAccounts}
        netWorthChange={overview.netWorthChange}
        totalAssetsChange={overview.totalAssetsChange}
        totalLiabilitiesChange={overview.totalLiabilitiesChange}
      />

      {/* Two-column shape: main workspace (Net Worth Over Time, the
          Assets/Liabilities category pair, closing insights panel) + a
          narrow utility rail as a true grid sibling, not a stack that
          only happens to collapse. Same RAIL_GRID_COLS/threshold as
          Transactions/Budgets/Goals/Missions/Investments/Retirement, for
          one consistent responsive behavior across all seven pages. */}
      <div className={`${RAIL_GRID_COLS} items-start`}>
        <div className="min-w-0 space-y-6">
          <NetWorthOverTimeCard
            history={overview.history}
            currentNetWorth={overview.netWorth}
            hasHistory={overview.hasHistory}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <NetWorthCategoryListCard
              title="Assets by Category"
              totalLabel="Total Assets"
              items={overview.assetsByCategory}
              total={overview.totalAssets}
              emptyText="No assets yet."
              changes={overview.assetCategoryChanges}
            />
            <NetWorthCategoryListCard
              title="Liabilities by Category"
              totalLabel="Total Liabilities"
              items={overview.liabilitiesByCategory}
              total={overview.totalLiabilities}
              emptyText="No liabilities yet."
              changes={overview.liabilityCategoryChanges}
            />
          </div>

          <NetWorthInsightsPanel netWorthChange={overview.netWorthChange} />
        </div>

        {/* True grid sibling of the workspace column above, visible only
            at the desktop threshold — this is what makes the rail sit
            beside the workspace rather than below it. */}
        <aside className="hidden space-y-4 min-[1360px]:block">
          <RailCards
            netWorth={overview.netWorth}
            totalLiabilities={overview.totalLiabilities}
            assetsByCategory={overview.assetsByCategory}
            hasAccounts={overview.hasAccounts}
            accountBalanceChanges={overview.accountBalanceChanges}
          />
        </aside>
      </div>

      {/* Below the threshold the grid above collapses to one column and
          <aside> is hidden — this is the stacked-below rendering of the
          same 3 cards, shown only at those narrower widths. */}
      <div className="space-y-4 min-[1360px]:hidden">
        <RailCards
          netWorth={overview.netWorth}
          totalLiabilities={overview.totalLiabilities}
          assetsByCategory={overview.assetsByCategory}
          hasAccounts={overview.hasAccounts}
          accountBalanceChanges={overview.accountBalanceChanges}
        />
      </div>
    </div>
  );
}
