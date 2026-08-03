import { getMissionsOverview } from "@/composition/missions-query";
import { requireAuthenticatedUser } from "@/lib/auth/authenticated-user";
import { ActiveMissionsCard } from "@/features/missions/components/active-missions-card";
import { AvailableMissionsCard } from "@/features/missions/components/available-missions-card";
import { CompletedMissionsCard } from "@/features/missions/components/completed-missions-card";
import { DailyMissionCard } from "@/features/missions/components/daily-mission-card";
import { MissionImpactCard } from "@/features/missions/components/mission-impact-card";
import { MissionsHeader } from "@/features/missions/components/missions-header";
import { MissionsSummaryMetrics } from "@/features/missions/components/missions-summary-metrics";
import { MissionsTabs } from "@/features/missions/components/missions-tabs";
import { MoreMissionsBanner } from "@/features/missions/components/more-missions-banner";
import { UpcomingRewardsCard } from "@/features/missions/components/upcoming-rewards-card";
import { RAIL_GRID_COLS } from "@/lib/page-grid";

// Live, per-owner data resolved at request time — must never be statically
// prerendered or cached across owners (same rule as Dashboard/Accounts/
// Transactions/Budgets/Goals/Reports).
export const dynamic = "force-dynamic";

// The rail's 3 cards, rendered once per breakpoint mode (desktop `aside`,
// stacked-below-threshold block) below — kept as one function so the two
// render sites can't drift out of sync with each other. Same pattern as
// Budgets'/Goals'/Transactions' RailCards.
function RailCards() {
  return (
    <>
      <DailyMissionCard />
      <MissionImpactCard />
      <UpcomingRewardsCard />
    </>
  );
}

export default async function MissionsPage() {
  const authUser = await requireAuthenticatedUser();
  const overview = await getMissionsOverview(authUser.id);

  return (
    // overflow-x-hidden + min-w-0: same containment boundary established
    // on Transactions/Budgets/Goals — a wide descendant must never be
    // able to inflate document.body.scrollWidth past the viewport on
    // narrow screens.
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      <MissionsHeader />

      {/* Two-column shape starts immediately below the header: left
          workspace (tabs + summary metrics + Active/Available/Completed
          Missions + closing banner) + a narrow utility rail as a true
          grid sibling. The tabs live INSIDE the left column here —
          unlike Budgets/Goals, where the tab divider needed to span the
          full content width, Missions' rail needs to start at the very
          top of the page (beside the tabs, not below them) so Daily
          Mission lines up with the intro panel above it. Confining the
          tabs to this column is what makes the divider stop at Active
          Missions' width instead of running under the rail. */}
      <div className={`${RAIL_GRID_COLS} items-start`}>
        <div className="min-w-0">
          <MissionsTabs>
            <div className="space-y-6">
              {/* Confined to this column's width (not full page width) —
                  that's what makes these 4 tiles match Active Missions'
                  exact width instead of spanning past the rail. */}
              <MissionsSummaryMetrics hasMissions={overview.hasMissions} />
              <ActiveMissionsCard />
              <AvailableMissionsCard />
              <CompletedMissionsCard />
              <MoreMissionsBanner />
            </div>
          </MissionsTabs>
        </div>

        {/* True grid sibling of the workspace column above, visible only
            at the desktop threshold — this is what makes the rail sit
            beside the workspace, starting at the same top edge as the
            tabs, rather than below it. */}
        <aside className="hidden space-y-4 min-[1360px]:block">
          <RailCards />
        </aside>
      </div>

      {/* Below the threshold the grid above collapses to one column and
          <aside> is hidden — this is the stacked-below rendering of the
          same 3 cards, shown only at those narrower widths. */}
      <div className="space-y-4 min-[1360px]:hidden">
        <RailCards />
      </div>
    </div>
  );
}
