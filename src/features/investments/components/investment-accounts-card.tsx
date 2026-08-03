import { Plus, Wallet } from "lucide-react";

import Card from "@/components/ui/card";
import CardHeader from "@/components/ui/card-header";

// TECH DEBT: the approved mockup's Investment Accounts table (brokerage/
// retirement/529/cash sub-types, day change, all-time return) requires an
// Investments domain that doesn't exist yet. The existing Accounts domain
// has "investment"/"retirement" account *types*, but only a single
// manually-entered currentBalance field — no day-change or return could
// be computed from it, and the mockup's finer sub-types (Brokerage, 529
// Plan) aren't modeled at all. Showing real Accounts rows here with
// fabricated change/return columns would misrepresent a plain balance as
// real portfolio tracking, so this renders one honest empty state instead
// of a partially-real table.
export function InvestmentAccountsCard() {
  return (
    <Card>
      <CardHeader title="Investment Accounts" />

      <div className="flex flex-col items-center justify-center rounded-[calc(var(--radius)-8px)] border border-dashed border-[var(--border)] px-6 py-12 text-center">
        <Wallet className="h-6 w-6 text-[var(--foreground-muted)]" strokeWidth={1.5} />
        <p className="mt-3 text-sm font-medium text-[var(--foreground-secondary)]">No investment accounts yet</p>
        <p className="mt-1 max-w-xs text-xs text-[var(--foreground-muted)]">
          Add an investment account to see it listed here.
        </p>
      </div>

      <button
        type="button"
        disabled
        title="Adding investment accounts isn't available yet"
        className="mt-4 flex cursor-not-allowed items-center gap-2 rounded-[calc(var(--radius)-8px)] border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground-muted)] opacity-70"
      >
        <Plus className="h-4 w-4" strokeWidth={1.75} />
        Add account
      </button>
    </Card>
  );
}
