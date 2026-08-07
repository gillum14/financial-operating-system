import { CreateBudgetButton } from "./create-budget-button";

export function BudgetsHeader() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">Budgets</h1>
        <p className="mt-1 text-sm text-[var(--foreground-muted)]">Plan your spending, track progress, and stay on target.</p>
      </div>

      <CreateBudgetButton />
    </div>
  );
}
