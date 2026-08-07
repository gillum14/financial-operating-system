import type { BudgetPeriodOption } from "@/application/budgets/budgets-views";
import { RailCard } from "@/components/ui/rail-card";

import { BudgetPeriodSelector } from "./budget-period-selector";

export function BudgetPeriodCard({
  currentPeriodId,
  periods,
}: {
  currentPeriodId?: string;
  periods?: BudgetPeriodOption[];
}) {
  return (
    <RailCard title="Budget Period">
      {currentPeriodId && periods && periods.length > 0 ? (
        <BudgetPeriodSelector currentPeriodId={currentPeriodId} periods={periods} />
      ) : (
        <button
          type="button"
          disabled
          title="No budget period is active yet"
          className="flex w-full cursor-not-allowed items-center justify-between rounded-[calc(var(--radius)-8px)] border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--foreground-muted)] opacity-70"
        >
          No active budget period
        </button>
      )}
    </RailCard>
  );
}
