import { LineChart } from "lucide-react";

import Card from "@/components/ui/card";
import CardHeader from "@/components/ui/card-header";

// TECH DEBT: the mockup's weekly income/spending/net-income bars require
// bucketing a period's transactions by week — a real, honest computation,
// but a genuinely new aggregation shape this slice hasn't built (today's
// composition only sums a whole period at once, see reports-query.ts).
// Rendered as an honest empty state rather than a fabricated chart.
export function CashFlowCard() {
  return (
    <Card>
      <CardHeader title="Cash Flow" />

      <div className="flex flex-col items-center justify-center rounded-[calc(var(--radius)-8px)] border border-dashed border-[var(--border)] px-6 py-8 text-center">
        <LineChart className="h-6 w-6 text-[var(--foreground-muted)]" strokeWidth={1.5} />
        <p className="mt-3 text-sm font-medium text-[var(--foreground-secondary)]">Weekly cash flow isn&apos;t available yet</p>
        <p className="mt-1 max-w-xs text-xs text-[var(--foreground-muted)]">
          This requires weekly transaction aggregation that hasn&apos;t been built.
        </p>
      </div>

      <button
        type="button"
        disabled
        title="Not available yet"
        className="mt-4 flex cursor-not-allowed items-center gap-1 text-sm font-medium text-[var(--foreground-muted)] opacity-70"
      >
        View full cash flow report
      </button>
    </Card>
  );
}
