import { TrendingUp } from "lucide-react";

import Card from "@/components/ui/card";
import CardHeader from "@/components/ui/card-header";

const STATS = ["Projected at Retirement", "Projected Peak", "Total Contributions", "Total Interest"] as const;

// TECH DEBT: a long-range retirement projection (balance forecast with
// confidence bands, projected peak, total interest) requires modeling
// this app has never built — no Retirement domain, no forecasting engine.
// No chart, confidence bands, or projected dollar figures invented for
// numbers that don't exist — same reasoning as Investments' Portfolio
// Value placeholder.
export function RetirementProjectionCard() {
  return (
    <Card>
      <CardHeader title="Retirement Projection">
        <button
          type="button"
          disabled
          title="Not available yet"
          className="cursor-not-allowed text-sm font-medium text-[var(--foreground-muted)] opacity-70"
        >
          View full projection
        </button>
      </CardHeader>

      <div className="flex flex-col items-center justify-center rounded-[calc(var(--radius)-8px)] border border-dashed border-[var(--border)] px-6 py-16 text-center">
        <TrendingUp className="h-6 w-6 text-[var(--foreground-muted)]" strokeWidth={1.5} />
        <p className="mt-3 text-sm font-medium text-[var(--foreground-secondary)]">Retirement projections aren&apos;t available yet</p>
        <p className="mt-1 max-w-xs text-xs text-[var(--foreground-muted)]">
          This requires retirement accounts and long-range forecasting that haven&apos;t been built.
        </p>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {STATS.map((label) => (
          <div key={label}>
            <dt className="text-[11px] font-semibold tracking-[0.1em] text-[var(--foreground-muted)] uppercase">{label}</dt>
            <dd className="mt-1 text-lg font-semibold text-[var(--foreground)]">—</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
