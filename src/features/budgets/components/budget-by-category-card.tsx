import { PiggyBank } from "lucide-react";

import type { BudgetCategoryRow } from "@/application/budgets/budgets-views";
import Card from "@/components/ui/card";
import CardHeader from "@/components/ui/card-header";
import { resolveCategoryColor } from "@/lib/category-color";

import { AddAllocationTrigger, type AllocatableCategoryOption } from "./add-allocation-trigger";
import { AllocationRowControls } from "./allocation-row-controls";

function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function CategoryRow({ row, editable }: { row: BudgetCategoryRow; editable: boolean }) {
  const color = resolveCategoryColor({ name: row.categoryName, color: row.categoryColor });
  const barPercent = row.utilization === null ? 0 : Math.min(100, Math.max(0, row.utilization));

  return (
    <div className="py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
          <span className="truncate text-sm font-medium text-[var(--foreground)]">{row.categoryName}</span>
          {row.overspending && (
            <span className="shrink-0 rounded-full bg-[var(--danger)]/10 px-2 py-0.5 text-xs font-medium text-[var(--danger)]">
              Over budget
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <span className="text-sm text-[var(--foreground-secondary)]">
            {formatCurrency(row.actual)} <span className="text-[var(--foreground-muted)]">of {formatCurrency(row.planned)}</span>
          </span>
          {editable && <AllocationRowControls allocationId={row.allocationId} plannedAmount={row.planned} categoryName={row.categoryName} />}
        </div>
      </div>

      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-hover)]">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${barPercent}%`,
            backgroundColor: row.overspending ? "var(--danger)" : color,
          }}
        />
      </div>

      <p className="mt-1 text-xs text-[var(--foreground-muted)]">
        {row.remaining >= 0 ? `${formatCurrency(row.remaining)} remaining` : `${formatCurrency(Math.abs(row.remaining))} over`}
      </p>
    </div>
  );
}

export function BudgetByCategoryCard({
  hasBudget,
  budgetPeriodId,
  categories,
  editable,
  allocatableCategories,
}: {
  hasBudget: boolean;
  budgetPeriodId?: string;
  categories?: BudgetCategoryRow[];
  editable?: boolean;
  allocatableCategories?: AllocatableCategoryOption[];
}) {
  if (!hasBudget || !budgetPeriodId) {
    return (
      <Card>
        <CardHeader title="Budget by Category" />

        <div className="flex flex-col items-center justify-center rounded-[calc(var(--radius)-8px)] border border-dashed border-[var(--border)] px-6 py-12 text-center">
          <PiggyBank className="h-6 w-6 text-[var(--foreground-muted)]" strokeWidth={1.5} />
          <p className="mt-3 text-sm font-medium text-[var(--foreground-secondary)]">No budgets created yet</p>
          <p className="mt-1 max-w-xs text-xs text-[var(--foreground-muted)]">
            Create a budget to start allocating amounts to your categories.
          </p>
        </div>
      </Card>
    );
  }

  const rows = categories ?? [];
  const canEdit = editable ?? false;

  return (
    <Card>
      <CardHeader title="Budget by Category" />

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[calc(var(--radius)-8px)] border border-dashed border-[var(--border)] px-6 py-12 text-center">
          <PiggyBank className="h-6 w-6 text-[var(--foreground-muted)]" strokeWidth={1.5} />
          <p className="mt-3 text-sm font-medium text-[var(--foreground-secondary)]">No categories allocated yet</p>
          <p className="mt-1 max-w-xs text-xs text-[var(--foreground-muted)]">
            Add a category below to start assigning planned amounts.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {rows.map((row) => (
            <CategoryRow key={row.allocationId} row={row} editable={canEdit} />
          ))}
        </div>
      )}

      {canEdit ? (
        <AddAllocationTrigger budgetPeriodId={budgetPeriodId} categoryOptions={allocatableCategories ?? []} />
      ) : (
        <button
          type="button"
          disabled
          title="This budget period is read-only"
          className="mt-4 flex cursor-not-allowed items-center gap-2 rounded-[calc(var(--radius)-8px)] border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground-muted)] opacity-70"
        >
          Add Category
        </button>
      )}
    </Card>
  );
}
