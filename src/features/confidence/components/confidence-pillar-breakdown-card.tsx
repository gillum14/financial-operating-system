import type { ConfidencePillarResult, ConfidenceTrend } from "@/application/confidence/confidence-views";
import Card from "@/components/ui/card";
import CardHeader from "@/components/ui/card-header";
import ProgressBar from "@/components/ui/progress-bar";
import { formatPercent, formatSignedScore } from "../format";
import { ReasonCodeBadge } from "./reason-code-badge";

// Presentation-only score-to-color mapping, distinct from the 6-tier
// Confidence Level bands (which only ever apply to the single overall
// score — confidence-engine.md defines no per-pillar band). A simple
// 3-tier tone is enough to scan 8 pillars at a glance without inventing a
// second banding system.
function scoreTone(score: number): string {
  if (score >= 70) return "var(--success)";
  if (score >= 40) return "var(--primary)";
  return "var(--danger)";
}

function PillarSignalRow({ signal }: { signal: ConfidencePillarResult["signals"][number] }) {
  return (
    <li className="flex items-start justify-between gap-3 py-2">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-[var(--foreground)]">{signal.label}</span>
          <ReasonCodeBadge reasonCode={signal.reasonCode} polarity={signal.polarity} />
        </div>
        <p className="mt-0.5 text-xs text-[var(--foreground-muted)]">{signal.message}</p>
      </div>
      <span className="shrink-0 text-sm font-semibold text-[var(--foreground-secondary)]">
        {signal.status === "available" && signal.score !== null ? Math.round(signal.score) : "—"}
      </span>
    </li>
  );
}

function PillarRow({ pillar, change }: { pillar: ConfidencePillarResult; change?: { absoluteChange: number } }) {
  return (
    <li className="border-b border-[var(--border-subtle)] pb-4 last:border-b-0 last:pb-0">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--foreground)]">{pillar.label}</p>
          <p className="text-xs text-[var(--foreground-muted)]">
            {formatPercent(pillar.weight * 100)} of the model
            {pillar.status === "available" && ` · ${formatPercent(pillar.effectiveWeight * 100)} of your current score`}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <span className="text-lg font-semibold text-[var(--foreground)]">
            {pillar.status === "available" && pillar.score !== null ? Math.round(pillar.score) : "—"}
          </span>
          {change && (
            <p className={`text-xs font-medium ${change.absoluteChange >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
              {formatSignedScore(change.absoluteChange)}
            </p>
          )}
        </div>
      </div>

      {pillar.status === "available" && pillar.score !== null ? (
        <ProgressBar percent={pillar.score} color={scoreTone(pillar.score)} className="mt-2" />
      ) : (
        <p className="mt-2 text-xs text-[var(--foreground-muted)]">Not enough data yet to measure this pillar.</p>
      )}

      <ul className="mt-3 divide-y divide-[var(--border-subtle)]">
        {pillar.signals.map((signal) => (
          <PillarSignalRow key={signal.id} signal={signal} />
        ))}
      </ul>
    </li>
  );
}

// The "Eight Dimensions of Financial Confidence" (confidence-engine.md) —
// every pillar, its score/weight/status, and every signal that
// contributed to (or was excluded from) it, with reason codes. This is
// the full pillar breakdown + reason-code visualization in one card;
// nothing here computes a score — every number rendered already exists on
// the ConfidencePillarResult/ConfidenceSignal objects passed in.
export function ConfidencePillarBreakdownCard({ pillars, trend }: { pillars: ConfidencePillarResult[]; trend: ConfidenceTrend | null }) {
  return (
    <Card>
      <CardHeader title="Pillar Breakdown" subtitle="The eight dimensions of financial confidence" />
      <ul className="space-y-4">
        {pillars.map((pillar) => (
          <PillarRow key={pillar.id} pillar={pillar} change={trend?.pillarChanges[pillar.id]} />
        ))}
      </ul>
    </Card>
  );
}
