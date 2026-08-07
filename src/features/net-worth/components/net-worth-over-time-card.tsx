import { LineChart as LineChartIcon } from "lucide-react";

import Card from "@/components/ui/card";
import CardHeader from "@/components/ui/card-header";
import { NetWorthHistoryChart, type NetWorthChartPoint } from "@/components/charts/net-worth-history-chart";
import type { NetWorthHistoryPoint } from "@/application/net-worth/net-worth-views";

const RANGES = ["1D", "7D", "30D", "3M", "6M", "YTD", "1Y", "ALL"] as const;

function formatMonthLabel(snapshotDate: string): string {
  return new Date(`${snapshotDate}T00:00:00`).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

// history holds only completed-month snapshots (see net-worth-history-
// calculations.ts) — the trailing "Today" point is the same live, real-
// time netWorth the summary metrics row shows, appended so the chart
// visually connects the immutable historical trend to the current
// dynamic value, per net-worth-model.md's hybrid "current dynamic +
// monthly scheduled snapshots" design. Never a fabricated point: it's the
// exact same number computeNetWorthBreakdown already returned this
// request.
export function NetWorthOverTimeCard({
  history,
  currentNetWorth,
  hasHistory,
}: {
  history: NetWorthHistoryPoint[];
  currentNetWorth: number;
  hasHistory: boolean;
}) {
  if (!hasHistory) {
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
          <LineChartIcon className="h-6 w-6 text-[var(--foreground-muted)]" strokeWidth={1.5} />
          <p className="mt-3 text-sm font-medium text-[var(--foreground-secondary)]">Net worth history isn&apos;t available yet</p>
          <p className="mt-1 max-w-xs text-xs text-[var(--foreground-muted)]">
            The first snapshot establishes your history baseline — check back after your next monthly snapshot.
          </p>
        </div>
      </Card>
    );
  }

  const chartData: NetWorthChartPoint[] = [
    ...history.map((point) => ({ date: formatMonthLabel(point.snapshotDate), netWorth: point.netWorth })),
    { date: "Today", netWorth: currentNetWorth },
  ];

  return (
    <Card>
      <CardHeader title="Net Worth Over Time">
        {/* Only ALL is meaningful with monthly-granularity snapshots — the
            shorter ranges (1D/7D/30D) would need daily snapshots this V1
            doesn't capture, so they stay disabled rather than silently
            showing the same data ALL would. */}
        <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Chart range">
          {RANGES.map((range) => {
            const isAll = range === "ALL";
            return (
              <button
                key={range}
                type="button"
                disabled={!isAll}
                aria-pressed={isAll}
                title={isAll ? undefined : "Needs daily snapshots, not available yet"}
                className={
                  isAll
                    ? "rounded-[calc(var(--radius)-10px)] bg-[var(--surface-hover)] px-2.5 py-1 text-xs font-medium text-[var(--foreground)]"
                    : "cursor-not-allowed rounded-[calc(var(--radius)-10px)] px-2.5 py-1 text-xs font-medium text-[var(--foreground-muted)] opacity-70"
                }
              >
                {range}
              </button>
            );
          })}
        </div>
      </CardHeader>

      <NetWorthHistoryChart data={chartData} />
    </Card>
  );
}
