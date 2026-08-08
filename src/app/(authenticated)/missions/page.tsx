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
import { RewardsTabPanel } from "@/features/missions/components/rewards-tab-panel";
import { UpcomingRewardsCard } from "@/features/missions/components/upcoming-rewards-card";
import { RAIL_GRID_COLS } from "@/lib/page-grid";

// Live, per-owner data resolved at request time — must never be statically
// prerendered or cached across owners (same rule as Dashboard/Accounts/
// Transactions/Budgets/Goals/Reports).
export const dynamic = "force-dynamic";

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

      {/* Same RAIL_GRID_COLS two-column shape as Budgets/Goals/
          Transactions: a main workspace column plus a narrow right rail,
          visible as a true grid sibling only past the desktop threshold —
          collapsed to a single stacked column below it (rendered as the
          second RailCards() block further down). This row's position is
          deliberately untouched by the tab-strip spacing tweak below — the
          right rail (Daily Mission first) must stay exactly where it was;
          MissionsTabs pulls itself up via its own negative margin instead
          of this row moving. */}
      <div className={`${RAIL_GRID_COLS} items-start`}>
        <div className="min-w-0">
          <MissionsTabs
            overviewPanel={
              <div className="space-y-6">
                <MissionsSummaryMetrics progression={overview.progression} />
                <ActiveMissionsCard missions={overview.active} />
                <AvailableMissionsCard topCandidates={overview.topCandidates} allCandidates={overview.candidates} />
                <CompletedMissionsCard missions={overview.completed} />
              </div>
            }
            rewardsPanel={<RewardsTabPanel progression={overview.progression} />}
          />
        </div>

        <aside className="hidden space-y-4 min-[1360px]:block">
          <DailyMissionCard candidate={overview.topCandidates[0] ?? null} />
          <MissionImpactCard summary={overview.impactSummary} />
          <UpcomingRewardsCard progression={overview.progression} />
        </aside>
      </div>

      <div className="space-y-4 min-[1360px]:hidden">
        <DailyMissionCard candidate={overview.topCandidates[0] ?? null} />
        <MissionImpactCard summary={overview.impactSummary} />
        <UpcomingRewardsCard progression={overview.progression} />
      </div>
    </div>
  );
}
