import { ChevronDown, Plus } from "lucide-react";

// TECH DEBT: there is no Investments domain yet (no schema, service,
// repository, or Server Action) — adding an investment account isn't
// possible. Shown disabled rather than omitted so the page's action
// hierarchy matches the approved mockup, same convention as Budgets'
// "Create Budget" and Goals' "Create Goal".
export function InvestmentsHeader() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">Investments</h1>
        <p className="mt-1 text-sm text-[var(--foreground-muted)]">Track your portfolio performance and build long-term wealth.</p>
      </div>

      <button
        type="button"
        disabled
        title="Adding an investment account isn't available yet"
        className="flex shrink-0 cursor-not-allowed items-center gap-2 rounded-[calc(var(--radius)-8px)] bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white opacity-60"
      >
        <Plus className="h-4 w-4" strokeWidth={2} />
        Add account
        <ChevronDown className="h-4 w-4" strokeWidth={2} />
      </button>
    </div>
  );
}
