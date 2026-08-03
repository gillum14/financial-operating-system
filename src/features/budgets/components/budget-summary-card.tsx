import { RailCard } from "@/components/ui/rail-card";

const ROWS = ["Income (After Tax)", "Total Budgeted", "Total Spent", "Remaining"] as const;

// TECH DEBT: every row here is budget-period-derived (or, for Income After
// Tax, requires payroll/tax data this app has never modeled) — no Budget
// domain exists yet. Pulling real numbers from Transactions (which does
// have income/expense totals) would misrepresent them as budget-period
// figures rather than the honest "no budget" state this card should show.
export function BudgetSummaryCard() {
  return (
    <RailCard title="Budget Summary">
      <dl className="space-y-2.5 text-sm">
        {ROWS.map((label) => (
          <div key={label} className="flex items-center justify-between">
            <dt className="text-[var(--foreground-secondary)]">{label}</dt>
            <dd className="text-[var(--foreground-muted)]">—</dd>
          </div>
        ))}
      </dl>
    </RailCard>
  );
}
