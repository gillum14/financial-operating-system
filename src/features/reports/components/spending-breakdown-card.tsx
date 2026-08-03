import { PieChart } from "lucide-react";

import Card from "@/components/ui/card";
import CardHeader from "@/components/ui/card-header";
import ProgressBar from "@/components/ui/progress-bar";
import type { CategorySpendItem } from "@/application/reports/reports-views";
import { categoryTone } from "@/lib/category-color";

import { formatCurrency } from "../format";

// Real spend grouped by category for the selected period (see
// reports-query.ts) — no donut/chart library introduced for this: a
// colored dot + per-category progress bar (reusing the existing
// ProgressBar primitive, same as Transactions' Spending Summary card)
// carries the same category-identity information the mockup's ring
// conveyed, without a new chart component.
export function SpendingBreakdownCard({
  categoryBreakdown,
  totalSpend,
}: {
  categoryBreakdown: CategorySpendItem[];
  totalSpend: number;
}) {
  return (
    <Card>
      <CardHeader title="Spending Breakdown" />

      {categoryBreakdown.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[calc(var(--radius)-8px)] border border-dashed border-[var(--border)] px-6 py-8 text-center">
          <PieChart className="h-6 w-6 text-[var(--foreground-muted)]" strokeWidth={1.5} />
          <p className="mt-3 text-sm font-medium text-[var(--foreground-secondary)]">No spending in this period</p>
          <p className="mt-1 max-w-xs text-xs text-[var(--foreground-muted)]">
            Category totals will appear here once there are expense transactions in range.
          </p>
        </div>
      ) : (
        <>
          <p className="text-2xl font-semibold text-[var(--foreground)]">{formatCurrency(totalSpend)}</p>
          <p className="text-xs text-[var(--foreground-muted)]">Total spending</p>

          <ul className="mt-4 space-y-3">
            {categoryBreakdown.map((item) => {
              const tone = categoryTone(item.categoryName);
              return (
                <li key={item.categoryId ?? item.categoryName}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-[var(--foreground-secondary)]">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: tone }} />
                      {item.categoryName}
                    </span>
                    <span className="text-[var(--foreground)]">
                      {formatCurrency(item.amount)}{" "}
                      <span className="text-[var(--foreground-muted)]">{Math.round(item.percent)}%</span>
                    </span>
                  </div>
                  <ProgressBar percent={item.percent} color={tone} className="mt-1.5" />
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Card>
  );
}
