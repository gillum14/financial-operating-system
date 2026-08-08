import Link from "next/link";
import { Gauge } from "lucide-react";

import type { ConfidenceOverviewView } from "@/composition/confidence-query";
import Card from "@/components/ui/card";
import { BAND_TONE, formatSignedScore } from "@/features/confidence/format";

type ConfidenceScoreCardProps = {
  overview: ConfidenceOverviewView;
  className?: string;
};

// Wrapped in a Link to /confidence — confidence-engine.md's Dashboard
// Experience section: "The Confidence Score serves as the primary entry
// point into the Confidence Engine. Selecting the Confidence Score opens
// the full Confidence Engine experience."
export function ConfidenceScoreCard({ overview, className = "" }: ConfidenceScoreCardProps) {
  return (
    <Link href="/confidence" className={`block ${className}`}>
      <Card className="h-full cursor-pointer">
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
    </Link>
  );
}
