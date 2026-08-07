import { Target, TrendingUp, Wallet } from "lucide-react";

import StatCard, { StatCaption } from "@/components/ui/stat-card";
import { RAIL_GRID_COLS } from "@/lib/page-grid";

function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

// Layout: Total Budgeted/Spent/Remaining share the main column, Overall
// Progress gets its own column at the SAME width as the rail below it
// (RAIL_GRID_COLS) — matching the approved mockup, where Overall
// Progress lines up with Budget Period/Summary/On Track/Recent
// Adjustments rather than being a fourth equal-width tile.
export function BudgetOverviewMetrics({
  hasBudget,
  metrics,
}: {
  hasBudget: boolean;
  metrics?: { totalBudgeted: number; totalSpent: number; totalRemaining: number; overallProgress: number };
}) {
  if (!hasBudget || !metrics) {
    return (
      <section className={RAIL_GRID_COLS}>
        <div className="grid gap-6 sm:grid-cols-3">
          <StatCard label="Total Budgeted" value="—" icon={Wallet}>
            <StatCaption caption="No active budget" />
          </StatCard>

          <StatCard label="Total Spent" value="—" icon={TrendingUp}>
            <StatCaption caption="No active budget" />
          </StatCard>

          <StatCard label="Total Remaining" value="—" icon={Wallet}>
            <StatCaption caption="No active budget" />
          </StatCard>
        </div>

        <StatCard label="Overall Progress" value="—" icon={Target}>
          <StatCaption caption="No active budget" />
        </StatCard>
      </section>
    );
  }

  const progressLabel = `${Math.round(metrics.overallProgress)}%`;

  return (
    <section className={RAIL_GRID_COLS}>
      <div className="grid gap-6 sm:grid-cols-3">
        <StatCard label="Total Budgeted" value={formatCurrency(metrics.totalBudgeted)} icon={Wallet}>
          <StatCaption caption="Planned this period" />
        </StatCard>

        <StatCard label="Total Spent" value={formatCurrency(metrics.totalSpent)} icon={TrendingUp}>
          <StatCaption caption="From categorized transactions" />
        </StatCard>

        <StatCard label="Total Remaining" value={formatCurrency(metrics.totalRemaining)} icon={Wallet}>
          <StatCaption
            caption={metrics.totalRemaining < 0 ? "Over budget" : "Available to allocate or spend"}
          />
        </StatCard>
      </div>

      <StatCard label="Overall Progress" value={progressLabel} icon={Target}>
        <StatCaption caption={metrics.overallProgress > 100 ? "Over budget overall" : "of total budgeted"} />
      </StatCard>
    </section>
  );
}
