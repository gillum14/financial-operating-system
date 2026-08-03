import { ChevronDown, Upload } from "lucide-react";

// TECH DEBT: there is no export capability yet (no CSV/PDF generation, no
// Server Action). Shown disabled rather than omitted so the page's action
// hierarchy matches the approved mockup, same convention as Transactions'
// "Import"/"Add Transaction" and Budgets' "Create Budget".
export function ReportsHeader() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">Reports</h1>
        <p className="mt-1 text-sm text-[var(--foreground-muted)]">Gain clarity with powerful insights into your money.</p>
      </div>

      <button
        type="button"
        disabled
        title="Exporting reports isn't available yet"
        className="flex shrink-0 cursor-not-allowed items-center gap-2 rounded-[calc(var(--radius)-8px)] border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground-muted)] opacity-70"
      >
        <Upload className="h-4 w-4" strokeWidth={1.75} />
        Export
        <ChevronDown className="h-4 w-4" strokeWidth={2} />
      </button>
    </div>
  );
}
