import type { ConfidenceCompleteness } from "@/application/confidence/confidence-views";
import { RailCard } from "@/components/ui/rail-card";
import ProgressBar from "@/components/ui/progress-bar";
import { formatPercent } from "../format";

// Lists exactly which pillars aren't measured yet and why (each pillar's
// own signals already carry the specific reason — NO_ACTIVE_BUDGET,
// NO_ACCOUNTS_AT_ALL, NOT_MEASURED_V1, etc.) — confidence-engine.md's
// "Transparency over Mystery": a user should always be able to see what
// isn't being counted, not just what is.
export function ConfidenceCompletenessCard({ completeness }: { completeness: ConfidenceCompleteness }) {
  return (
    <RailCard title="Data Completeness">
      <p className="text-2xl font-semibold text-[var(--foreground)]">
        {completeness.availablePillars}
        <span className="text-sm font-normal text-[var(--foreground-muted)]"> / {completeness.totalPillars} pillars</span>
      </p>
      <p className="mt-1 text-xs text-[var(--foreground-muted)]">
        {formatPercent(completeness.coveredWeightPercent)} of the full model is currently measured
      </p>
      <ProgressBar percent={completeness.coveredWeightPercent} className="mt-2" />

      {completeness.unavailablePillars.length > 0 && (
        <ul className="mt-4 space-y-1.5 border-t border-[var(--border-subtle)] pt-3">
          {completeness.unavailablePillars.map((pillar) => (
            <li key={pillar.id} className="flex items-center justify-between text-xs">
              <span className="text-[var(--foreground-secondary)]">{pillar.label}</span>
              <span className="text-[var(--foreground-muted)]">Not measured</span>
            </li>
          ))}
        </ul>
      )}
    </RailCard>
  );
}
