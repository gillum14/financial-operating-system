import Card from "@/components/ui/card";
import CardHeader from "@/components/ui/card-header";
import ProgressBar from "@/components/ui/progress-bar";
import type { CategorySpendItem } from "@/application/reports/reports-views";
import { categoryTone } from "@/lib/category-color";

const TOP_N = 3;

// Real top-3 categories from the same categoryBreakdown the Spending
// Breakdown card uses — a subset view, not a second computation.
export function TopSpendingCategoriesCard({ categoryBreakdown }: { categoryBreakdown: CategorySpendItem[] }) {
  const top = categoryBreakdown.slice(0, TOP_N);

  return (
    <Card>
      <CardHeader title="Top Spending Categories" />

      {top.length === 0 ? (
        <p className="text-sm text-[var(--foreground-secondary)]">No spending in this period.</p>
      ) : (
        <ol className="space-y-4">
          {top.map((item, index) => {
            const tone = categoryTone(item.categoryName);
            return (
              <li key={item.categoryId ?? item.categoryName}>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-[var(--foreground-secondary)]">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--surface-hover)] text-xs font-semibold text-[var(--foreground-muted)]">
                      {index + 1}
                    </span>
                    {item.categoryName}
                  </span>
                  <span className="text-[var(--foreground-muted)]">{Math.round(item.percent)}%</span>
                </div>
                <ProgressBar percent={item.percent} color={tone} className="mt-1.5" />
              </li>
            );
          })}
        </ol>
      )}

      <button
        type="button"
        disabled
        title="Not available yet"
        className="mt-4 flex cursor-not-allowed items-center gap-1 text-sm font-medium text-[var(--foreground-muted)] opacity-70"
      >
        View all categories
      </button>
    </Card>
  );
}
