import { DollarSign, TrendingUp } from "lucide-react";

import StatCard, { StatCaption } from "@/components/ui/stat-card";

// All three tiles are honest placeholders while hasInvestments is false —
// "—" rather than "$0.00", since "zero portfolio value" and "portfolios
// aren't a supported concept yet" are different facts. No "vs prior 30
// days"/"All time"/"Today" deltas: those are real, computable-looking
// comparisons the approved mockup shows, but there's no historical
// portfolio-value data to compute them from.
export function InvestmentsSummaryMetrics({ hasInvestments }: { hasInvestments: boolean }) {
  if (hasInvestments) {
    // Unreachable today (hasInvestments is always false — see
    // investments-query.ts), kept as the real-data branch this component
    // will take once an Investments domain exists, so this file doesn't
    // need a rewrite at that point.
    return null;
  }

  return (
    <section className="grid gap-6 md:grid-cols-3">
      <StatCard label="Total Investments" value="—" icon={TrendingUp}>
        <StatCaption caption="No investment accounts yet" />
      </StatCard>

      <StatCard label="Total Gain / Loss" value="—" icon={TrendingUp}>
        <StatCaption caption="No investment accounts yet" />
      </StatCard>

      <StatCard label="Day Change" value="—" icon={DollarSign}>
        <StatCaption caption="No investment accounts yet" />
      </StatCard>
    </section>
  );
}
