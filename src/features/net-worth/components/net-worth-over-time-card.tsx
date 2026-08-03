import { LineChart } from "lucide-react";

import Card from "@/components/ui/card";
import CardHeader from "@/components/ui/card-header";

const RANGES = ["1D", "7D", "30D", "3M", "6M", "YTD", "1Y", "ALL"] as const;

// TECH DEBT: a net-worth-over-time chart requires historical net-worth
// snapshots this app has never stored — only the current balance of each
// account is known, not its value on any past date. The range buttons are
// shown (matching the approved mockup's hierarchy) but disabled, since
// there's no data for any of them to switch between. No chart invented
// for numbers that don't exist — same reasoning as Investments' Portfolio
// Value placeholder.
export function NetWorthOverTimeCard() {
  return (
    <Card>
      <CardHeader title="Net Worth Over Time">
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
        <p className="mt-3 text-sm font-medium text-[var(--foreground-secondary)]">Net worth history isn&apos;t available yet</p>
        <p className="mt-1 max-w-xs text-xs text-[var(--foreground-muted)]">
          This requires historical balance snapshots that haven&apos;t been built.
        </p>
      </div>
    </Card>
  );
}
