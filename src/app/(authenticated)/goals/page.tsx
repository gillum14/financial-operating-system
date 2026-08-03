import { getGoalsOverview } from "@/composition/goals-query";
import { requireAuthenticatedUser } from "@/lib/auth/authenticated-user";
import { GoalsHeader } from "@/features/goals/components/goals-header";
import { GoalsOverviewCard } from "@/features/goals/components/goals-overview-card";
import { GoalsOverviewMetrics } from "@/features/goals/components/goals-overview-metrics";
import { GoalsTabs } from "@/features/goals/components/goals-tabs";
import { ProgressSummaryCard } from "@/features/goals/components/progress-summary-card";
import { RecentContributionsCard } from "@/features/goals/components/recent-contributions-card";
import { UpcomingMilestonesCard } from "@/features/goals/components/upcoming-milestones-card";
import { RAIL_GRID_COLS } from "@/lib/page-grid";

// Live, per-owner data resolved at request time — must never be statically
// prerendered or cached across owners (same rule as Dashboard/Accounts/
// Transactions/Budgets/Reports).
export const dynamic = "force-dynamic";

// The rail's 3 cards, rendered once per breakpoint mode (desktop `aside`,
// stacked-below-threshold block) below — kept as one function so the two
// render sites can't drift out of sync with each other. Same pattern as
// Budgets'/Transactions' RailCards.
function RailCards() {
  return (
    <>
      <ProgressSummaryCard />
      <UpcomingMilestonesCard />
      <RecentContributionsCard />
    </>
  );
}

export default async function GoalsPage() {
  const authUser = await requireAuthenticatedUser();
  const overview = await getGoalsOverview(authUser.id);

  return (
    // overflow-x-hidden + min-w-0: same containment boundary established
    // on Transactions/Budgets — a wide descendant must never be able to
    // inflate document.body.scrollWidth past the viewport on narrow
    // screens.
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      <GoalsHeader />

      {/* Tabs and the 4 overview metrics are full-width, NOT inside the
          two-column grid below — same fix applied to Budgets: putting the
          tab strip inside the (narrower) grid column left its divider
          stopping short of the rail's width instead of spanning the full
          content area. Unlike Budgets, these 4 metric tiles are plain
          equal-width cards (the approved mockup doesn't align any of them
          with the rail), so this row uses a simple grid, not
          RAIL_GRID_COLS. */}
      <GoalsTabs>
        <div className="space-y-6">
          <GoalsOverviewMetrics hasGoals={overview.hasGoals} />

          {/* Two-column shape starts here: main workspace + a narrow
              utility rail as a true grid sibling, not a stack that only
              happens to collapse. Same RAIL_GRID_COLS/threshold as
              Transactions and Budgets, for one consistent responsive
              behavior across all three pages. */}
          <div className={`${RAIL_GRID_COLS} items-start`}>
            <div className="min-w-0">
              <GoalsOverviewCard hasGoals={overview.hasGoals} />
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
      </GoalsTabs>
    </div>
  );
}
