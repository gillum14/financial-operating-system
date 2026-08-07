import { Lightbulb } from "lucide-react";

import Card from "@/components/ui/card";
import type { NetWorthChange } from "@/application/net-worth/net-worth-views";

function formatComparisonDate(dateString: string): string {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// One honest, real insight — the same netWorthChange the summary metrics
// tile already shows, restated as a sentence. Deliberately NOT the fuller
// "insights" concept (correlated trends, spending-driven explanations,
// multi-factor analysis) — that requires more than one historical
// comparison point and a real explanation model this app doesn't have.
// Falls back to the honest unavailable state until a comparison point
// exists, same as before.
export function NetWorthInsightsPanel({ netWorthChange }: { netWorthChange: NetWorthChange | null }) {
  if (!netWorthChange) {
    return (
      <Card className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-hover)] text-[var(--foreground-muted)]">
            <Lightbulb className="h-4 w-4" strokeWidth={1.75} />
          </span>
          <p className="text-sm text-[var(--foreground-secondary)]">
            Net worth insights aren&apos;t available yet — this requires historical balance snapshots that haven&apos;t been built.
          </p>
        </div>

        <button
          type="button"
          disabled
          title="Not available yet"
          className="shrink-0 cursor-not-allowed text-sm font-medium text-[var(--foreground-muted)] opacity-70"
        >
          View insights
        </button>
      </Card>
    );
  }

  const direction = netWorthChange.absoluteChange >= 0 ? "increased" : "decreased";
  const percentLabel =
    netWorthChange.percentChange !== null ? ` (${Math.abs(netWorthChange.percentChange).toFixed(1)}%)` : "";

  return (
    <Card className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-hover)] text-[var(--primary)]">
          <Lightbulb className="h-4 w-4" strokeWidth={1.75} />
        </span>
        <p className="text-sm text-[var(--foreground-secondary)]">
          Your net worth has {direction}{percentLabel} since {formatComparisonDate(netWorthChange.comparisonDate)}.
        </p>
      </div>

      <button
        type="button"
        disabled
        title="Not available yet"
        className="shrink-0 cursor-not-allowed text-sm font-medium text-[var(--foreground-muted)] opacity-70"
      >
        View insights
      </button>
    </Card>
  );
}
