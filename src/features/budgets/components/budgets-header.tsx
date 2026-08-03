import { ChevronDown, Plus } from "lucide-react";

// TECH DEBT: there is no Budget domain yet (no schema, service, repository,
// or Server Action) — creating a budget isn't possible. Shown disabled
// rather than omitted so the page's action hierarchy matches the approved
// mockup, per the same convention as Transactions' "Add Transaction" and
// Accounts' "Connect a bank account (coming soon)".
export function BudgetsHeader() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">Budgets</h1>
        <p className="mt-1 text-sm text-[var(--foreground-muted)]">Plan your spending, track progress, and stay on target.</p>
      </div>

      <button
        type="button"
        disabled
        title="Creating budgets isn't available yet"
        className="flex shrink-0 cursor-not-allowed items-center gap-2 rounded-[calc(var(--radius)-8px)] bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white opacity-60"
      >
        <Plus className="h-4 w-4" strokeWidth={2} />
        Create Budget
        <ChevronDown className="h-4 w-4" strokeWidth={2} />
      </button>
    </div>
  );
}
