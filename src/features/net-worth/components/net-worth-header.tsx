import { ChevronDown, Upload } from "lucide-react";

// TECH DEBT: there is no export capability yet (no CSV/PDF generation, no
// Server Action) — same convention as Reports' "Export" button.
export function NetWorthHeader() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">Net Worth</h1>
        <p className="mt-1 text-sm text-[var(--foreground-muted)]">Track your overall financial health and long-term progress.</p>
      </div>

      <button
        type="button"
        disabled
        title="Exporting isn't available yet"
        className="flex shrink-0 cursor-not-allowed items-center gap-2 rounded-[calc(var(--radius)-8px)] border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground-muted)] opacity-70"
      >
        <Upload className="h-4 w-4" strokeWidth={1.75} />
        Export
        <ChevronDown className="h-4 w-4" strokeWidth={2} />
      </button>
    </div>
  );
}
