import { Gauge } from "lucide-react";

import type { ConfidenceBandId } from "@/application/confidence/confidence-views";
import type { ConfidenceOverviewView } from "@/composition/confidence-query";
import Card from "@/components/ui/card";

type ConfidenceScoreCardProps = {
  overview: ConfidenceOverviewView;
  className?: string;
};

// Exceptional/Strong read as genuinely good news; Stable/Building are
// encouraging-neutral (confidence-engine.md: "labels are intentionally
// encouraging rather than judgmental," not a pass/fail signal);
// Vulnerable/At Risk are the only bands that warrant the danger tone —
// still never red-alarming language, just an honest visual cue.
const BAND_TONE: Record<ConfidenceBandId, string> = {
  exceptional: "var(--success)",
  strong: "var(--success)",
  stable: "var(--primary)",
  building: "var(--primary)",
  vulnerable: "var(--warning)",
  atRisk: "var(--danger)",
};

function formatSignedScore(value: number): string {
  const rounded = Math.round(value);
  return `${rounded >= 0 ? "+" : ""}${rounded}`;
}

export function ConfidenceScoreCard({ overview, className = "" }: ConfidenceScoreCardProps) {
  return (
    <Card className={className}>
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold tracking-[0.12em] text-[var(--foreground-muted)] uppercase">
          Confidence Score
        </p>

        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--surface-hover)] text-[var(--foreground-secondary)]">
          <Gauge className="h-4 w-4" strokeWidth={1.75} />
        </span>
      </div>

      {!overview.hasEvidence || overview.overallScore === null || overview.band === null ? (
        <>
          <p className="mt-2 text-3xl font-bold tracking-tight text-[var(--foreground-muted)]">—</p>
          <p className="mt-1 text-sm text-[var(--foreground-muted)]">
            Not enough data yet — add accounts, a budget, or goals to build your Confidence Score.
          </p>
        </>
      ) : (
        <>
          <p className="mt-2 text-5xl font-bold tracking-tight text-[var(--foreground)]">{overview.overallScore}</p>

          <p className="mt-1 text-sm" style={{ color: BAND_TONE[overview.band.id] }}>
            {overview.band.label}
          </p>

          <div className="mt-4 border-t border-[var(--border-subtle)] pt-3">
            {overview.trend?.overallChange ? (
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--foreground-muted)]">vs {overview.trend.overallChange.comparisonDate}</span>
                <span
                  className={`font-medium ${overview.trend.overallChange.absoluteChange >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}`}
                >
                  {formatSignedScore(overview.trend.overallChange.absoluteChange)}
                </span>
              </div>
            ) : (
              <p className="text-xs text-[var(--foreground-muted)]">
                {overview.hasHistory
                  ? "Trend unavailable for this period."
                  : "First snapshot will establish your trend baseline."}
              </p>
            )}
          </div>
        </>
      )}
    </Card>
  );
}
