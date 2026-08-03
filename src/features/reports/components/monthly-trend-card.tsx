import { TrendingUp } from "lucide-react";

import Card from "@/components/ui/card";
import CardHeader from "@/components/ui/card-header";

// TECH DEBT: a 6-month trend requires grouping transactions by calendar
// month across a trailing 6-month window — a different, wider aggregation
// than anything the period selector above computes (that's always a
// single selected period). Not built yet, so rendered honestly empty
// rather than a fabricated line chart.
export function MonthlyTrendCard() {
  return (
    <Card>
      <CardHeader title="Monthly Trend" />

      <div className="flex flex-col items-center justify-center rounded-[calc(var(--radius)-8px)] border border-dashed border-[var(--border)] px-6 py-8 text-center">
        <TrendingUp className="h-6 w-6 text-[var(--foreground-muted)]" strokeWidth={1.5} />
        <p className="mt-3 text-sm font-medium text-[var(--foreground-secondary)]">Monthly trends aren&apos;t available yet</p>
        <p className="mt-1 max-w-xs text-xs text-[var(--foreground-muted)]">
          This requires multi-month transaction aggregation that hasn&apos;t been built.
        </p>
      </div>
    </Card>
  );
}
