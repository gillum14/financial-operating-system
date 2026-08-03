import { Target, TrendingUp, Wallet } from "lucide-react";

import StatCard, { StatCaption } from "@/components/ui/stat-card";

import { RAIL_GRID_COLS } from "@/lib/page-grid";

// All four tiles are honest placeholders while hasBudget is false — "—"
// rather than "$0.00", since a real zero-dollar budget and "no budget
// exists at all" are different facts and showing $0.00 would blur them.
//
// Layout: Total Budgeted/Spent/Remaining share the main column, Overall
// Progress gets its own column at the SAME width as the rail below it
// (RAIL_GRID_COLS) — matching the approved mockup, where Overall
// Progress lines up with Budget Period/Summary/On Track/Recent
// Adjustments rather than being a fourth equal-width tile.
export function BudgetOverviewMetrics({ hasBudget }: { hasBudget: boolean }) {
  if (hasBudget) {
    // Unreachable today (hasBudget is always false — see budgets-query.ts),
    // kept as the real-data branch this component will take once a Budget
    // domain exists, so this file doesn't need a rewrite at that point.
    return null;
  }

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
