import { Lightbulb } from "lucide-react";

import Card from "@/components/ui/card";

// TECH DEBT: performance-comparison insights ("Your portfolio is
// outperforming the market by 2.34%") require historical holdings data
// and a market benchmark — neither exists. This is exactly the kind of
// fabricated comparison this slice was told not to invent (same
// reasoning as Reports' InsightPanel). Rendered as an honest, disabled
// placeholder instead.
export function InvestmentsInsightPanel() {
  return (
    <Card className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-hover)] text-[var(--foreground-muted)]">
          <Lightbulb className="h-4 w-4" strokeWidth={1.75} />
        </span>
        <p className="text-sm text-[var(--foreground-secondary)]">
          Performance insights aren&apos;t available yet — this requires investment accounts and historical pricing data that haven&apos;t been built.
        </p>
      </div>

      <button
        type="button"
        disabled
        title="Not available yet"
        className="shrink-0 cursor-not-allowed text-sm font-medium text-[var(--foreground-muted)] opacity-70"
      >
        View performance
      </button>
    </Card>
  );
}
