import { getInvestmentsOverview } from "@/composition/investments-query";
import { requireAuthenticatedUser } from "@/lib/auth/authenticated-user";
import { AssetAllocationCard } from "@/features/investments/components/asset-allocation-card";
import { InvestmentAccountsCard } from "@/features/investments/components/investment-accounts-card";
import { InvestmentsHeader } from "@/features/investments/components/investments-header";
import { InvestmentsInsightPanel } from "@/features/investments/components/investments-insight-panel";
import { InvestmentsSummaryMetrics } from "@/features/investments/components/investments-summary-metrics";
import { InvestmentsTabs } from "@/features/investments/components/investments-tabs";
import { PortfolioValueCard } from "@/features/investments/components/portfolio-value-card";
import { RecentActivityCard } from "@/features/investments/components/recent-activity-card";
import { TopHoldingsCard } from "@/features/investments/components/top-holdings-card";
import { RAIL_GRID_COLS } from "@/lib/page-grid";

// Live, per-owner data resolved at request time — must never be statically
// prerendered or cached across owners (same rule as Dashboard/Accounts/
// Transactions/Budgets/Goals/Reports/Missions).
export const dynamic = "force-dynamic";

// The rail's 3 cards, rendered once per breakpoint mode (desktop `aside`,
// stacked-below-threshold block) below — kept as one function so the two
// render sites can't drift out of sync with each other. Same pattern as
// Budgets'/Goals'/Missions'/Transactions' RailCards.
function RailCards() {
  return (
    <>
      <AssetAllocationCard />
      <TopHoldingsCard />
      <RecentActivityCard />
    </>
  );
}

export default async function InvestmentsPage() {
  const authUser = await requireAuthenticatedUser();
  const overview = await getInvestmentsOverview(authUser.id);

  return (
    // overflow-x-hidden + min-w-0: same containment boundary established
    // on Transactions/Budgets/Goals/Missions — a wide descendant must
    // never be able to inflate document.body.scrollWidth past the
    // viewport on narrow screens.
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      <InvestmentsHeader />

      {/* Tabs are full-width, NOT inside the two-column grid below — the
          divider spans the full content area, unlike Missions (whose own
          mockup needed the rail to start beside the tabs). Here Asset
          Allocation sits on the right, but still below the tab divider,
          not beside it. The summary metrics, however, live INSIDE the
          grid's left column (not their own full-width row) so they're
          confined to Portfolio Value's exact width instead of spanning
          past the rail — that's what lets Asset Allocation move up to
          start at the same top edge as the metrics row. */}
      <InvestmentsTabs>
        <div className={`${RAIL_GRID_COLS} items-start`}>
          <div className="min-w-0 space-y-6">
            {/* Confined to this column's width (not full page width) —
                that's what makes these 3 tiles match Portfolio Value's
                exact width instead of spanning past the rail. */}
            <InvestmentsSummaryMetrics hasInvestments={overview.hasInvestments} />
            <PortfolioValueCard />
            <InvestmentAccountsCard />
            <InvestmentsInsightPanel />
          </div>

          {/* True grid sibling of the workspace column above, visible
              only at the desktop threshold — this is what makes the rail
              sit beside the workspace, starting at the same top edge as
              the metrics row, rather than below it. */}
          <aside className="hidden space-y-4 min-[1360px]:block">
            <RailCards />
          </aside>
        </div>

        {/* Below the threshold the grid above collapses to one column and
            <aside> is hidden — this is the stacked-below rendering of the
            same 3 cards, shown only at those narrower widths. */}
        <div className="mt-6 space-y-4 min-[1360px]:hidden">
          <RailCards />
        </div>
      </InvestmentsTabs>
    </div>
  );
}
