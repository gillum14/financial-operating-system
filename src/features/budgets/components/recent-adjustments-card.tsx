import type { BudgetAdjustmentRow } from "@/application/budgets/budgets-views";
import { RailCard } from "@/components/ui/rail-card";

function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function RecentAdjustmentsCard({ adjustments }: { adjustments?: BudgetAdjustmentRow[] }) {
  if (!adjustments || adjustments.length === 0) {
    return (
      <RailCard title="Recent Adjustments">
        <p className="text-sm text-[var(--foreground-secondary)]">No adjustments yet.</p>
      </RailCard>
    );
  }

  return (
    <RailCard title="Recent Adjustments">
      <ul className="space-y-3">
        {adjustments.map((adjustment) => (
          <li key={adjustment.id} className="text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate font-medium text-[var(--foreground)]">{adjustment.categoryName}</span>
              <span className="shrink-0 text-xs text-[var(--foreground-muted)]">{adjustment.changedAtLabel}</span>
            </div>
            <p className="mt-0.5 text-xs text-[var(--foreground-secondary)]">
              {formatCurrency(adjustment.previousAmount)} → {formatCurrency(adjustment.newAmount)}
            </p>
          </li>
        ))}
      </ul>
    </RailCard>
  );
}
