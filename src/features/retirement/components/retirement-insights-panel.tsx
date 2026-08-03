import { Lightbulb } from "lucide-react";

import Card from "@/components/ui/card";

// TECH DEBT: readiness insights ("You're on track... 87% probability of
// success... increase contributions by $150/month") require a full
// retirement-planning engine (projections, confidence intervals,
// contribution modeling) that doesn't exist. This is exactly the kind of
// fabricated recommendation this slice was told not to invent. Rendered
// as an honest, disabled placeholder instead (same reasoning as Reports'
// InsightPanel and Investments' InvestmentsInsightPanel).
export function RetirementInsightsPanel() {
  return (
    <Card className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-hover)] text-[var(--foreground-muted)]">
          <Lightbulb className="h-4 w-4" strokeWidth={1.75} />
        </span>
        <p className="text-sm text-[var(--foreground-secondary)]">
          Retirement insights aren&apos;t available yet — this requires retirement accounts and forecasting that haven&apos;t been built.
        </p>
      </div>

      <button
        type="button"
        disabled
        title="Not available yet"
        className="shrink-0 cursor-not-allowed text-sm font-medium text-[var(--foreground-muted)] opacity-70"
      >
        View Recommendations
      </button>
    </Card>
  );
}
