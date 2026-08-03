import { ChevronDown, Plus, Upload } from "lucide-react";

// TECH DEBT: neither CSV/provider import nor manual transaction creation
// has a UI or Server Action wired up yet (TransactionService.createTransaction
// exists at the service layer but nothing calls it from this app). Shown
// disabled rather than omitted so the page's action hierarchy matches the
// approved mockup, per the same convention as the Accounts page's "Connect
// a bank account (coming soon)" item.
export function TransactionsHeader() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">Transactions</h1>
        <p className="mt-1 text-sm text-[var(--foreground-muted)]">Review, search, and manage your transactions.</p>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          disabled
          title="Importing transactions isn't available yet"
          className="flex cursor-not-allowed items-center gap-2 rounded-[calc(var(--radius)-8px)] border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground-muted)] opacity-70"
        >
          <Upload className="h-4 w-4" strokeWidth={1.75} />
          Import
        </button>
        <button
          type="button"
          disabled
          title="Adding a transaction manually isn't available yet"
          className="flex cursor-not-allowed items-center gap-2 rounded-[calc(var(--radius)-8px)] bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white opacity-60"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          Add Transaction
          <ChevronDown className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
