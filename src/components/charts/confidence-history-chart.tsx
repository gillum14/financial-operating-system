"use client";

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipContentProps } from "recharts";

export interface ConfidenceChartPoint {
  date: string;
  score: number | null;
}

function CustomTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }
  const value = payload[0]?.value;
  if (typeof value !== "number") return null;

  return (
    <div className="rounded-[calc(var(--radius)-6px)] border border-[var(--border)] bg-[var(--chart-tooltip-bg)] px-3 py-2 shadow-[var(--shadow-md)]">
      <p className="text-xs font-medium text-[var(--foreground-muted)]">{label}</p>
      <p className="mt-1 text-sm font-medium text-[var(--primary)]">{Math.round(value)}</p>
    </div>
  );
}

// Single series (one Confidence Score per date) — no legend box needed,
// the card title already names it, same convention as
// net-worth-history-chart.tsx. The y-axis is fixed to the real 0-100
// score range (never auto-scaled), and reference lines mark the two
// band boundaries most useful for reading the chart at a glance (55 =
// Building/Vulnerable, 85 = Strong/Stable) — purely a chart-reading aid,
// not a recomputation of the bands themselves (see confidence-
// calculations.ts's CONFIDENCE_BANDS for the authoritative values).
export function ConfidenceHistoryChart({ data }: { data: ConfidenceChartPoint[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />

          <XAxis
            dataKey="date"
            stroke="var(--foreground-muted)"
            tick={{ fill: "var(--foreground-muted)", fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: "var(--chart-grid)" }}
          />

          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            stroke="var(--foreground-muted)"
            tick={{ fill: "var(--foreground-muted)", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={32}
          />

          <ReferenceLine y={85} stroke="var(--chart-grid)" strokeDasharray="2 2" />
          <ReferenceLine y={55} stroke="var(--chart-grid)" strokeDasharray="2 2" />

          <Tooltip content={CustomTooltip} cursor={{ stroke: "var(--border)" }} />

          <Line
            type="monotone"
            dataKey="score"
            name="Confidence Score"
            stroke="var(--primary)"
            strokeWidth={2}
            dot={{ r: 3, fill: "var(--primary)", strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
