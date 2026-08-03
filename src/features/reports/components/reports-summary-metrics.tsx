import { Percent, Scale, TrendingUp, Wallet } from "lucide-react";

import StatCard, { StatCaption } from "@/components/ui/stat-card";
import type { TransactionsSummary } from "@/application/transactions/transactions-views";

import { formatCurrency } from "../format";

// Real numbers for the selected period (see reports-query.ts) — no
// period-over-period comparison arrows: that would require fetching and
// diffing a second period, which this slice deliberately doesn't do
// rather than fabricate a "vs prior period" delta.
export function ReportsSummaryMetrics({
  summary,
  savingsRate,
  periodLabel,
}: {
  summary: TransactionsSummary;
  savingsRate: number | null;
  periodLabel: string;
}) {
  return (
    <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Total Income" value={formatCurrency(summary.income)} icon={TrendingUp}>
        <StatCaption caption={periodLabel} />
      </StatCard>

      <StatCard label="Total Spending" value={formatCurrency(summary.expenses)} icon={Wallet}>
        <StatCaption caption={periodLabel} />
      </StatCard>

      <StatCard label="Net Income" value={formatCurrency(summary.net)} icon={Scale}>
        <StatCaption caption={periodLabel} />
      </StatCard>

      <StatCard label="Savings Rate" value={savingsRate === null ? "—" : `${Math.round(savingsRate)}%`} icon={Percent}>
        <StatCaption caption={savingsRate === null ? "No income this period" : periodLabel} />
      </StatCard>
    </section>
  );
}
