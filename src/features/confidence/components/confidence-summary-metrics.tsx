import { Gauge, ListChecks, Sparkles } from "lucide-react";

import type { ConfidenceCompleteness, ConfidenceTrend } from "@/application/confidence/confidence-views";
import StatCard, { StatCaption, StatDelta } from "@/components/ui/stat-card";
import { BAND_TONE, formatComparisonDate, formatPercent, formatSignedScore } from "../format";

export function ConfidenceSummaryMetrics({
  overallScore,
  band,
  hasEvidence,
  hasHistory,
  trend,
  completeness,
  asOfLabel,
}: {
  overallScore: number | null;
  band: { id: string; label: string } | null;
  hasEvidence: boolean;
  hasHistory: boolean;
  trend: ConfidenceTrend | null;
  completeness: ConfidenceCompleteness;
  asOfLabel: string;
}) {
  return (
    <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      <StatCard label="Confidence Score" value={hasEvidence && overallScore !== null ? String(overallScore) : "—"} icon={Gauge}>
        {trend?.overallChange ? (
          <StatDelta
            deltaLabel={formatSignedScore(trend.overallChange.absoluteChange)}
            positive={trend.overallChange.absoluteChange >= 0}
            caption={`vs ${formatComparisonDate(trend.overallChange.comparisonDate)}`}
          />
        ) : (
          <StatCaption
            caption={
              !hasEvidence
                ? "Not enough data yet"
                : hasHistory
                  ? "Trend unavailable for this period"
                  : `As of ${asOfLabel}`
            }
          />
        )}
      </StatCard>

      <StatCard label="Confidence Level" value={hasEvidence && band ? band.label : "—"} icon={Sparkles}>
        <StatCaption caption={hasEvidence && band ? `Score of ${overallScore}` : "Add accounts, a budget, or goals to get started"} />
        {hasEvidence && band && (
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-hover)]">
            <div className="h-full rounded-full" style={{ width: `${overallScore ?? 0}%`, backgroundColor: BAND_TONE[band.id as keyof typeof BAND_TONE] }} />
          </div>
        )}
      </StatCard>

      <StatCard label="Data Completeness" value={`${completeness.availablePillars} of ${completeness.totalPillars}`} icon={ListChecks}>
        <StatCaption caption={`${formatPercent(completeness.coveredWeightPercent)} of the full model is measured`} />
      </StatCard>
    </section>
  );
}
