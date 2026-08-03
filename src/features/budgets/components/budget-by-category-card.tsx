import { PiggyBank, Plus } from "lucide-react";

import Card from "@/components/ui/card";
import CardHeader from "@/components/ui/card-header";

// TECH DEBT: budget-category allocations (budgeted amount, spent, remaining,
// progress per category) don't exist yet — no Budget domain. Showing the
// user's real Categories here with fabricated $0 budgeted/spent/progress
// values would look like an active, zeroed-out budget rather than "no
// budget exists," so this renders one honest empty state for the whole
// section instead of a populated-looking table.
export function BudgetByCategoryCard({ hasBudget }: { hasBudget: boolean }) {
  if (hasBudget) {
    // Unreachable today — see budgets-query.ts. Real rows (icon, category,
    // budgeted, spent, remaining, progress) will replace this branch once
    // a Budget domain exists.
    return null;
  }

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

      <button
        type="button"
        disabled
        title="Add a category to a budget once one exists"
        className="mt-4 flex cursor-not-allowed items-center gap-2 rounded-[calc(var(--radius)-8px)] border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground-muted)] opacity-70"
      >
        <Plus className="h-4 w-4" strokeWidth={1.75} />
        Add Category
      </button>
    </Card>
  );
}
