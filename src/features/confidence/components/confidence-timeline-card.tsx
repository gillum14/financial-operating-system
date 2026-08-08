import { LineChart as LineChartIcon } from "lucide-react";

import type { ConfidenceHistoryPoint } from "@/application/confidence/confidence-views";
import Card from "@/components/ui/card";
import CardHeader from "@/components/ui/card-header";
import { ConfidenceHistoryChart, type ConfidenceChartPoint } from "@/components/charts/confidence-history-chart";
import { formatChartDate } from "../format";

// history holds only real, previously-captured snapshots — never the
// current live score appended (unlike Net Worth's over-time chart), since
// which pillars were available can differ from point to point, so a
// historical Confidence Score point isn't the same kind of continuation
// current Net Worth is. The current score is shown in the summary metrics
// row above this card instead.
export function ConfidenceTimelineCard({ history, hasHistory }: { history: ConfidenceHistoryPoint[]; hasHistory: boolean }) {
  if (!hasHistory || history.length === 0) {
    return (
      <Card>
        <CardHeader title="Confidence Timeline" />
        <div className="flex flex-col items-center justify-center rounded-[calc(var(--radius)-8px)] border border-dashed border-[var(--border)] px-6 py-16 text-center">
          <LineChartIcon className="h-6 w-6 text-[var(--foreground-muted)]" strokeWidth={1.5} />
          <p className="mt-3 text-sm font-medium text-[var(--foreground-secondary)]">Confidence history isn&apos;t available yet</p>
          <p className="mt-1 max-w-xs text-xs text-[var(--foreground-muted)]">
            The first snapshot establishes your history baseline — check back after your next capture.
          </p>
        </div>
      </Card>
    );
  }

  const chartData: ConfidenceChartPoint[] = history.map((point) => ({
    date: formatChartDate(point.snapshotDate),
    score: point.overallScore,
  }));

  return (
    <Card>
      <CardHeader title="Confidence Timeline" subtitle="Your Confidence Score over time" />
      <ConfidenceHistoryChart data={chartData} />
    </Card>
  );
}
