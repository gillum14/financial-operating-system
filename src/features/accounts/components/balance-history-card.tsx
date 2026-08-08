import { LineChart } from "lucide-react";

import Card from "@/components/ui/card";
import CardHeader from "@/components/ui/card-header";

// TECH DEBT: Balance history has no backing data model — accounts store
// only a single current balance (accounts.current_balance), not a
// time series of historical balances or snapshots. Rendering the fake
// upward-trending line shown in the approved mockup would fabricate
// account history that doesn't exist, which the delivery spec explicitly
// prohibits. This renders the mockup's card shell (title + period control)
// honestly empty instead — a balance-snapshot table and a real chart are
// a separate, dedicated slice.
export function BalanceHistoryCard() {
  return (
    <Card>
      <CardHeader title="Balance history">
        <select
          disabled
          aria-label="Balance history period (not yet available)"
          defaultValue="1m"
          className="cursor-not-allowed rounded-[calc(var(--radius)-8px)] border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-sm text-[var(--foreground-muted)] opacity-70"
        >
          <option value="1m">1 Month</option>
        </select>
      </CardHeader>

      <div className="flex h-64 flex-col items-center justify-center rounded-[calc(var(--radius)-8px)] border border-dashed border-[var(--border)] text-center">
        <LineChart className="h-6 w-6 text-[var(--foreground-muted)]" strokeWidth={1.5} />
        <p className="mt-3 text-sm font-medium text-[var(--foreground-secondary)]">Balance history isn&apos;t tracked yet</p>
        <p className="mt-1 max-w-xs text-xs text-[var(--foreground-muted)]">
          Mocal currently stores only the current balance for each account, not a history of past values.
        </p>
      </div>
    </Card>
  );
}
