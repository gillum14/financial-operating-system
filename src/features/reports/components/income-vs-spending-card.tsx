import Card from "@/components/ui/card";
import CardHeader from "@/components/ui/card-header";
import ProgressBar from "@/components/ui/progress-bar";
import type { TransactionsSummary } from "@/application/transactions/transactions-views";

import { formatCurrency } from "../format";

// Real numbers for the selected period — each bar is that figure's share
// of (income + spending) combined, not a fabricated comparison to a prior
// period.
export function IncomeVsSpendingCard({ summary }: { summary: TransactionsSummary }) {
  const total = summary.income + summary.expenses;
  const incomePercent = total > 0 ? (summary.income / total) * 100 : 0;
  const spendingPercent = total > 0 ? (summary.expenses / total) * 100 : 0;

  return (
    <Card>
      <CardHeader title="Income vs. Spending" />

      {total === 0 ? (
        <p className="text-sm text-[var(--foreground-secondary)]">No income or spending in this period.</p>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="text-lg font-semibold text-[var(--foreground)]">{formatCurrency(summary.income)}</p>
            <p className="text-xs text-[var(--foreground-muted)]">Income</p>
            <div className="mt-2 flex items-center gap-3">
              <ProgressBar percent={incomePercent} color="var(--success)" className="flex-1" />
              <span className="text-xs text-[var(--foreground-muted)]">{Math.round(incomePercent)}%</span>
            </div>
          </div>

          <div>
            <p className="text-lg font-semibold text-[var(--foreground)]">{formatCurrency(summary.expenses)}</p>
            <p className="text-xs text-[var(--foreground-muted)]">Spending</p>
            <div className="mt-2 flex items-center gap-3">
              <ProgressBar percent={spendingPercent} color="var(--primary)" className="flex-1" />
              <span className="text-xs text-[var(--foreground-muted)]">{Math.round(spendingPercent)}%</span>
            </div>
          </div>

          <div className="border-t border-[var(--border-subtle)] pt-3">
            <p className="text-sm text-[var(--foreground-secondary)]">Net Income</p>
            <p className={`text-lg font-semibold ${summary.net >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
              {formatCurrency(summary.net)}
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}
