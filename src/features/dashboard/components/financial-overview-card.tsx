import Card from "@/components/ui/card";
import CardHeader from "@/components/ui/card-header";
import {
  FinancialOverviewChart,
  FinancialOverviewLegend,
} from "@/components/charts/financial-overview-chart";
import type { CashFlowPoint } from "@/features/dashboard/types";

type CashFlowPeriod = {
  label: string;
  income: number;
  expenses: number;
  netCashFlow: number;
};

// Real amounts carry cents; a bare toLocaleString() shows however many
// decimals a given number happens to have (e.g. "$450" next to "$272.73"),
// so every figure in this card is forced to the same precision.
function formatAmount(value: number): string {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function FinancialOverviewCard({
  series,
  period,
}: {
  series: CashFlowPoint[];
  period: CashFlowPeriod;
}) {
  return (
    <Card>
      <CardHeader title="Financial Overview" subtitle="Income vs Expenses">
        <FinancialOverviewLegend />
      </CardHeader>

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="min-w-0 flex-1">
          <FinancialOverviewChart data={series} />
        </div>

        <div className="shrink-0 border-[var(--border-subtle)] lg:w-44 lg:border-l lg:pl-6">
          <p className="text-xs font-semibold tracking-[0.1em] text-[var(--foreground-muted)] uppercase">
            {period.label}
          </p>

          <div className="mt-4 space-y-4">
            <div>
              <p className="text-xs font-medium text-[var(--primary)]">Income</p>
              <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">
                ${formatAmount(period.income)}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-[var(--foreground-muted)]">Expenses</p>
              <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">
                ${formatAmount(period.expenses)}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-[var(--foreground-muted)]">Net Cash Flow</p>
              <p
                className={`mt-1 text-lg font-semibold ${
                  period.netCashFlow >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"
                }`}
              >
                {period.netCashFlow < 0 ? "-" : ""}${formatAmount(Math.abs(period.netCashFlow))}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
