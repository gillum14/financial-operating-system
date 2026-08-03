import { Calendar, Percent, Target, Wallet } from "lucide-react";

import StatCard, { StatCaption } from "@/components/ui/stat-card";

// All four tiles are honest placeholders while hasGoals is false — "—"
// rather than "0", since "zero active goals" and "goals aren't a
// supported concept yet" are different facts. Unlike Budgets' Overall
// Progress tile, none of these need to align with the rail below — the
// approved mockup shows 4 plain, equal-width cards here.
export function GoalsOverviewMetrics({ hasGoals }: { hasGoals: boolean }) {
  if (hasGoals) {
    // Unreachable today (hasGoals is always false — see goals-query.ts),
    // kept as the real-data branch this component will take once a Goals
    // domain exists, so this file doesn't need a rewrite at that point.
    return null;
  }

  return (
    <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Total Goals" value="—" icon={Target}>
        <StatCaption caption="No goals created yet" />
      </StatCard>

      <StatCard label="Total Saved" value="—" icon={Wallet}>
        <StatCaption caption="No goals created yet" />
      </StatCard>

      <StatCard label="Average Progress" value="—" icon={Percent}>
        <StatCaption caption="No goals created yet" />
      </StatCard>

      <StatCard label="On Track" value="—" icon={Calendar}>
        <StatCaption caption="No goals created yet" />
      </StatCard>
    </section>
  );
}
