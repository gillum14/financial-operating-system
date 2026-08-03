import { LineChart } from "lucide-react";

import Card from "@/components/ui/card";
import CardHeader from "@/components/ui/card-header";

const RANGES = ["1D", "7D", "30D", "3M", "6M", "YTD", "1Y", "ALL"] as const;

// TECH DEBT: a portfolio-value-over-time chart requires historical
// holdings/pricing data this app has never modeled — no Investments
// domain, no market-data feed. The range buttons are shown (matching the
// approved mockup's hierarchy) but disabled, since there's no data for
// any of them to switch between. No chart invented for numbers that
// don't exist — same reasoning as Reports' Cash Flow/Monthly Trend
// placeholders.
export function PortfolioValueCard() {
  return (
    <Card>
      <CardHeader title="Portfolio Value">
        <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Chart range (not available yet)">
          {RANGES.map((range) => (
            <button
              key={range}
              type="button"
              disabled
              title="Not available yet"
              className="cursor-not-allowed rounded-[calc(var(--radius)-10px)] px-2.5 py-1 text-xs font-medium text-[var(--foreground-muted)] opacity-70"
            >
              {range}
            </button>
          ))}
        </div>
      </CardHeader>

      <div className="flex flex-col items-center justify-center rounded-[calc(var(--radius)-8px)] border border-dashed border-[var(--border)] px-6 py-16 text-center">
        <LineChart className="h-6 w-6 text-[var(--foreground-muted)]" strokeWidth={1.5} />
        <p className="mt-3 text-sm font-medium text-[var(--foreground-secondary)]">Portfolio value history isn&apos;t available yet</p>
        <p className="mt-1 max-w-xs text-xs text-[var(--foreground-muted)]">
          This requires investment accounts and historical pricing data that haven&apos;t been built.
        </p>
      </div>
    </Card>
  );
}
