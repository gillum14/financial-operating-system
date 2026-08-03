import { Banknote, Calendar, PieChart, ShieldCheck, Target } from "lucide-react";

import StatCard, { StatCaption } from "@/components/ui/stat-card";

// All five tiles are honest placeholders while hasRetirementPlan is false
// — "—" rather than "$0.00"/"0%", since "zero portfolio value" and
// "retirement planning isn't a supported concept yet" are different
// facts. No "vs prior 30 days" deltas, no target-age countdown, no
// probability-of-success score: none of that is computable without a
// Retirement domain, and the approved mockup's numbers for them are
// exactly the kind of forecast data this slice was told not to invent.
export function RetirementSummaryMetrics({ hasRetirementPlan }: { hasRetirementPlan: boolean }) {
  if (hasRetirementPlan) {
    // Unreachable today (hasRetirementPlan is always false — see
    // retirement-query.ts), kept as the real-data branch this component
    // will take once a Retirement domain exists, so this file doesn't
    // need a rewrite at that point.
    return null;
  }

  return (
    <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <StatCard label="Retirement Portfolio" value="—" icon={PieChart}>
        <StatCaption caption="No retirement accounts yet" />
      </StatCard>

      <StatCard label="Annual Contributions" value="—" icon={Target}>
        <StatCaption caption="No retirement accounts yet" />
      </StatCard>

      <StatCard label="Estimated Monthly Income" value="—" icon={Banknote}>
        <StatCaption caption="No retirement plan yet" />
      </StatCard>

      <StatCard label="Retirement Age" value="—" icon={Calendar}>
        <StatCaption caption="No retirement plan yet" />
      </StatCard>

      <StatCard label="Probability of Success" value="—" icon={ShieldCheck}>
        <StatCaption caption="No retirement plan yet" />
      </StatCard>
    </section>
  );
}
