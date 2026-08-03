import { getRetirementOverview } from "@/composition/retirement-query";
import { requireAuthenticatedUser } from "@/lib/auth/authenticated-user";
import { RetirementAccountsCard } from "@/features/retirement/components/retirement-accounts-card";
import { RetirementAssetAllocationCard } from "@/features/retirement/components/retirement-asset-allocation-card";
import { RetirementHeader } from "@/features/retirement/components/retirement-header";
import { RetirementIncomeBreakdownCard } from "@/features/retirement/components/retirement-income-breakdown-card";
import { RetirementInsightsPanel } from "@/features/retirement/components/retirement-insights-panel";
import { RetirementProjectionCard } from "@/features/retirement/components/retirement-projection-card";
import { RetirementSummaryMetrics } from "@/features/retirement/components/retirement-summary-metrics";
import { RetirementTabs } from "@/features/retirement/components/retirement-tabs";
import { UpcomingContributionsCard } from "@/features/retirement/components/upcoming-contributions-card";
import { RAIL_GRID_COLS } from "@/lib/page-grid";

// Live, per-owner data resolved at request time — must never be statically
// prerendered or cached across owners (same rule as Dashboard/Accounts/
// Transactions/Budgets/Goals/Reports/Missions/Investments).
export const dynamic = "force-dynamic";

// The rail's 3 cards, rendered once per breakpoint mode (desktop `aside`,
// stacked-below-threshold block) below — kept as one function so the two
// render sites can't drift out of sync with each other. Same pattern as
// Budgets'/Goals'/Missions'/Investments'/Transactions' RailCards.
function RailCards() {
  return (
    <>
      <RetirementAssetAllocationCard />
      <RetirementIncomeBreakdownCard />
      <UpcomingContributionsCard />
    </>
  );
}

export default async function RetirementPage() {
  const authUser = await requireAuthenticatedUser();
  const overview = await getRetirementOverview(authUser.id);

  return (
    // overflow-x-hidden + min-w-0: same containment boundary established
    // on Transactions/Budgets/Goals/Missions/Investments — a wide
    // descendant must never be able to inflate document.body.scrollWidth
    // past the viewport on narrow screens.
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      <RetirementHeader />

      {/* Tabs and the 5 summary metrics are full-width, NOT inside the
          two-column grid below — the approved mockup shows both the tab
          divider and the metrics row spanning the entire content area,
          with the Retirement Projection / Asset Allocation split starting
          only after them (same shape as Goals/Budgets; unlike Missions/
          Investments, whose own mockups needed the rail to start beside
          the tabs instead). */}
      <RetirementTabs>
        <div className="space-y-6">
          <RetirementSummaryMetrics hasRetirementPlan={overview.hasRetirementPlan} />

          {/* Two-column shape starts here: main workspace (Retirement
              Projection, Retirement Accounts, closing insights panel) + a
              narrow utility rail as a true grid sibling, not a stack that
              only happens to collapse. Same RAIL_GRID_COLS/threshold as
              Transactions/Budgets/Goals/Missions/Investments, for one
              consistent responsive behavior across all six pages. */}
          <div className={`${RAIL_GRID_COLS} items-start`}>
            <div className="min-w-0 space-y-6">
              <RetirementProjectionCard />
              <RetirementAccountsCard />
              <RetirementInsightsPanel />
            </div>

            {/* True grid sibling of the workspace column above, visible
                only at the desktop threshold — this is what makes the
                rail sit beside the workspace rather than below it. */}
            <aside className="hidden space-y-4 min-[1360px]:block">
              <RailCards />
            </aside>
          </div>

          {/* Below the threshold the grid above collapses to one column
              and <aside> is hidden — this is the stacked-below rendering
              of the same 3 cards, shown only at those narrower widths. */}
          <div className="space-y-4 min-[1360px]:hidden">
            <RailCards />
          </div>
        </div>
      </RetirementTabs>
    </div>
  );
}
