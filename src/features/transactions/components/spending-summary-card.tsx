import ProgressBar from "@/components/ui/progress-bar";
import type { CategorySpendItem } from "@/application/transactions/transactions-views";

import { categoryTone } from "../category-color";
import { formatCurrency } from "../format";
import { RailCard } from "./rail-card";

// Real spend grouped by category, over the same filter window as the rest
// of the page — never a separate "vs last month" comparison, since only
// one period is ever fetched here and fabricating a prior-period delta
// isn't worth the dishonesty. No donut/chart library added for this: a
// colored dot + per-category progress bar (reusing the existing
// ProgressBar primitive) carries the same category-identity information
// the mockup's ring conveyed, without introducing a new chart component.
export function SpendingSummaryCard({
  categoryBreakdown,
  totalSpend,
  periodLabel,
}: {
  categoryBreakdown: CategorySpendItem[];
  totalSpend: number;
  periodLabel: string;
}) {
  return (
    <RailCard title="Spending Summary" action={<span className="text-xs text-[var(--foreground-muted)]">{periodLabel}</span>}>
      {categoryBreakdown.length === 0 ? (
        <div>
          <p className="text-sm text-[var(--foreground-secondary)]">No spending in this period</p>
          <p className="mt-1 text-xs text-[var(--foreground-muted)]">
            Category totals will appear when expense transactions are available.
          </p>
        </div>
      ) : (
        <>
          <p className="text-xl font-semibold text-[var(--foreground)]">{formatCurrency(totalSpend)}</p>
          <p className="text-xs text-[var(--foreground-muted)]">Total spending</p>

          <ul className="mt-3 space-y-2.5">
            {categoryBreakdown.map((item) => {
              // Hashed by name, not categoryId: the table's CategoryPill
              // only ever has the name available, so hashing by name here
              // too keeps a category's color identical in both places.
              const tone = categoryTone(item.categoryName);
              return (
                <li key={item.categoryId ?? item.categoryName}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-[var(--foreground-secondary)]">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: tone }} />
                      {item.categoryName}
                    </span>
                    <span className="text-[var(--foreground)]">
                      {formatCurrency(item.amount)}{" "}
                      <span className="text-[var(--foreground-muted)]">{Math.round(item.percent)}%</span>
                    </span>
                  </div>
                  <ProgressBar percent={item.percent} color={tone} className="mt-1" />
                </li>
              );
            })}
          </ul>
        </>
      )}
    </RailCard>
  );
}
