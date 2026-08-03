import { Plus, Wallet } from "lucide-react";

import Card from "@/components/ui/card";
import CardHeader from "@/components/ui/card-header";

// TECH DEBT: the approved mockup's Retirement Accounts table (401(k)/IRA/
// HSA sub-types, YTD change, allocation %, annual contribution) requires
// a Retirement domain that doesn't exist yet. The existing Accounts
// domain has a "retirement" account *type*, but only a single manually-
// entered currentBalance field — no YTD change, allocation, or
// contribution tracking could be computed from it. Showing real Accounts
// rows here with fabricated columns would misrepresent a plain balance as
// real retirement tracking, so this renders one honest empty state
// instead of a partially-real table (same reasoning as Investments'
// InvestmentAccountsCard).
export function RetirementAccountsCard() {
  return (
    <Card>
      <CardHeader title="Retirement Accounts">
        <button
          type="button"
          disabled
          title="Not available yet"
          className="cursor-not-allowed text-sm font-medium text-[var(--foreground-muted)] opacity-70"
        >
          View full accounts
        </button>
      </CardHeader>

      <div className="flex flex-col items-center justify-center rounded-[calc(var(--radius)-8px)] border border-dashed border-[var(--border)] px-6 py-12 text-center">
        <Wallet className="h-6 w-6 text-[var(--foreground-muted)]" strokeWidth={1.5} />
        <p className="mt-3 text-sm font-medium text-[var(--foreground-secondary)]">No retirement accounts yet</p>
        <p className="mt-1 max-w-xs text-xs text-[var(--foreground-muted)]">
          Add a retirement account to see it listed here.
        </p>
      </div>

      <button
        type="button"
        disabled
        title="Adding retirement accounts isn't available yet"
        className="mt-4 flex cursor-not-allowed items-center gap-2 rounded-[calc(var(--radius)-8px)] border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground-muted)] opacity-70"
      >
        <Plus className="h-4 w-4" strokeWidth={1.75} />
        Add account
      </button>
    </Card>
  );
}
