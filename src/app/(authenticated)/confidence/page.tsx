import { getConfidenceOverview } from "@/composition/confidence-query";
import { requireAuthenticatedUser } from "@/lib/auth/authenticated-user";
import { ConfidenceCompletenessCard } from "@/features/confidence/components/confidence-completeness-card";
import { ConfidenceContributorsCard } from "@/features/confidence/components/confidence-contributors-card";
import { ConfidenceExplanationCard } from "@/features/confidence/components/confidence-explanation-card";
import { ConfidenceHeader } from "@/features/confidence/components/confidence-header";
import { ConfidencePillarBreakdownCard } from "@/features/confidence/components/confidence-pillar-breakdown-card";
import { ConfidenceSummaryMetrics } from "@/features/confidence/components/confidence-summary-metrics";
import { ConfidenceTimelineCard } from "@/features/confidence/components/confidence-timeline-card";
import { RAIL_GRID_COLS } from "@/lib/page-grid";

// Live, per-owner data resolved at request time — must never be statically
// prerendered or cached across owners (same rule as every other
// authenticated page).
export const dynamic = "force-dynamic";

export default async function ConfidencePage() {
  const authUser = await requireAuthenticatedUser();
  const overview = await getConfidenceOverview(authUser.id);

  return (
    // overflow-x-hidden + min-w-0: same containment boundary established
    // on every sibling page — a wide descendant (the chart, the pillar
    // list) must never be able to inflate document.body.scrollWidth past
    // the viewport on narrow screens.
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      <ConfidenceHeader />

      <ConfidenceSummaryMetrics
        overallScore={overview.overallScore}
        band={overview.band}
        hasEvidence={overview.hasEvidence}
        hasHistory={overview.hasHistory}
        trend={overview.trend}
        completeness={overview.completeness}
        asOfLabel={overview.asOfLabel}
      />

      {/* Same two-column shape (main workspace + narrow utility rail) as
          Net Worth/Budgets/Goals/Reports — one consistent responsive
          behavior across every page in the app. */}
      <div className={`${RAIL_GRID_COLS} items-start`}>
        <div className="min-w-0 space-y-6">
          <ConfidenceTimelineCard history={overview.history} hasHistory={overview.hasHistory} />

          <ConfidencePillarBreakdownCard pillars={overview.pillars} trend={overview.trend} />

          <div className="grid gap-6 lg:grid-cols-2">
            <ConfidenceContributorsCard
              title="Positive Contributors"
              signals={overview.positiveSignals}
              emptyText="No positive contributors yet — as you add real financial activity, what's helping your score will show up here."
            />
            <ConfidenceContributorsCard
              title="Negative Contributors"
              signals={overview.negativeSignals}
              emptyText="No negative contributors right now."
            />
          </div>

          <ConfidenceExplanationCard explanation={overview.explanation} />
        </div>

        <aside className="hidden space-y-4 min-[1360px]:block">
          <ConfidenceCompletenessCard completeness={overview.completeness} />
        </aside>
      </div>

      <div className="space-y-4 min-[1360px]:hidden">
        <ConfidenceCompletenessCard completeness={overview.completeness} />
      </div>
    </div>
  );
}
