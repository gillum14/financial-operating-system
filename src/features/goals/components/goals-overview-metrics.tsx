import { Calendar, Percent, Target, Wallet } from "lucide-react";

import StatCard, { StatCaption } from "@/components/ui/stat-card";
import type { GoalsOverviewMetricsView } from "@/application/goals/goals-views";

function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function GoalsOverviewMetrics({
  hasGoals,
  metrics,
}: {
  hasGoals: boolean;
  metrics?: GoalsOverviewMetricsView;
}) {
  if (!hasGoals || !metrics) {
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

  return (
    <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Total Goals" value={String(metrics.totalGoals)} icon={Target}>
        <StatCaption caption="Active and completed" />
      </StatCard>

      <StatCard label="Total Saved" value={formatCurrency(metrics.totalSaved)} icon={Wallet}>
        <StatCaption caption="Across all goals" />
      </StatCard>

      <StatCard label="Average Progress" value={`${Math.round(metrics.averageProgress)}%`} icon={Percent}>
        <StatCaption caption="Across all goals" />
      </StatCard>

      <StatCard label="On Track" value={String(metrics.onTrackCount)} icon={Calendar}>
        <StatCaption caption="Excellent or on-track pace" />
      </StatCard>
    </section>
  );
}
