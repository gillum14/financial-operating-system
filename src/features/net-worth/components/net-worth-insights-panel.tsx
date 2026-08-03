import { Lightbulb } from "lucide-react";

import Card from "@/components/ui/card";

// TECH DEBT: trend-based insights ("Your net worth increased 2.98% over
// the last 30 days") require a historical net-worth snapshot this app
// doesn't store. This is exactly the kind of fabricated comparison this
// slice was told not to invent. Rendered as an honest, disabled
// placeholder instead (same reasoning as Reports'/Investments'/
// Retirement's insight panels).
export function NetWorthInsightsPanel() {
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
