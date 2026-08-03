import { ChevronDown, LineChart } from "lucide-react";

// TECH DEBT: there is no Retirement domain yet (no schema, service,
// repository, or Server Action) — a retirement planning tool isn't
// possible. Shown disabled rather than omitted so the page's action
// hierarchy matches the approved mockup, same convention as Budgets'
// "Create Budget" and Investments' "Add account".
export function RetirementHeader() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">Retirement</h1>
        <p className="mt-1 text-sm text-[var(--foreground-muted)]">Plan today for the lifestyle you want tomorrow.</p>
      </div>

      <button
        type="button"
        disabled
        title="The retirement planner isn't available yet"
        className="flex shrink-0 cursor-not-allowed items-center gap-2 rounded-[calc(var(--radius)-8px)] bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white opacity-60"
      >
        <LineChart className="h-4 w-4" strokeWidth={1.75} />
        Retirement Planner
        <ChevronDown className="h-4 w-4" strokeWidth={2} />
      </button>
    </div>
  );
}
