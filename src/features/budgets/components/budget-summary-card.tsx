import { RailCard } from "@/components/ui/rail-card";

function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

// TECH DEBT: "Income (After Tax)" requires payroll/tax data this app has
// never modeled (no income-planning concept exists yet) — shown as "—"
// even when a real budget exists, the same honest-gap posture the rest of
// this row set already uses, rather than fabricating a number from
// unrelated Transaction income totals.
export function BudgetSummaryCard({
  metrics,
}: {
  metrics?: { totalBudgeted: number; totalSpent: number; totalRemaining: number };
}) {
  const rows: { label: string; value: string }[] = [
    { label: "Income (After Tax)", value: "—" },
    { label: "Total Budgeted", value: metrics ? formatCurrency(metrics.totalBudgeted) : "—" },
    { label: "Total Spent", value: metrics ? formatCurrency(metrics.totalSpent) : "—" },
    { label: "Remaining", value: metrics ? formatCurrency(metrics.totalRemaining) : "—" },
  ];

  return (
    <RailCard title="Budget Summary">
      <dl className="space-y-2.5 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between">
            <dt className="text-[var(--foreground-secondary)]">{row.label}</dt>
            <dd className={row.value === "—" ? "text-[var(--foreground-muted)]" : "font-medium text-[var(--foreground)]"}>
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </RailCard>
  );
}
