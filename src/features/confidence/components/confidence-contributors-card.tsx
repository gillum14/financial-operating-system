import type { ConfidenceSignal } from "@/application/confidence/confidence-views";
import Card from "@/components/ui/card";
import CardHeader from "@/components/ui/card-header";
import { ReasonCodeBadge } from "./reason-code-badge";

// Shared shell for the Positive Contributors / Negative Contributors
// cards — same real signal data the Pillar Breakdown card shows, just
// filtered to one polarity and ranked by influence (see confidence-
// presentation.ts's selectPositiveSignals/selectNegativeSignals). Reused
// for both sides rather than two near-duplicate components.
export function ConfidenceContributorsCard({
  title,
  signals,
  emptyText,
}: {
  title: string;
  signals: ConfidenceSignal[];
  emptyText: string;
}) {
  return (
    <Card>
      <CardHeader title={title} />
      {signals.length === 0 ? (
        <p className="text-sm text-[var(--foreground-secondary)]">{emptyText}</p>
      ) : (
        <ul className="space-y-3">
          {signals.map((signal) => (
            <li key={signal.id}>
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-sm font-medium text-[var(--foreground)]">{signal.label}</span>
                <span className="shrink-0 text-sm font-semibold text-[var(--foreground-secondary)]">
                  {signal.score !== null ? Math.round(signal.score) : "—"}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-[var(--foreground-muted)]">{signal.message}</p>
              <div className="mt-1.5">
                <ReasonCodeBadge reasonCode={signal.reasonCode} polarity={signal.polarity} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
