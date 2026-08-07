"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipContentProps } from "recharts";

export interface NetWorthChartPoint {
  date: string;
  netWorth: number;
}

function formatCompact(value: number) {
  const sign = value < 0 ? "-" : "";
  return `${sign}$${Math.round(Math.abs(value) / 1000)}K`;
}

function CustomTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }
  const value = payload[0]?.value;

  return (
    <div className="rounded-[calc(var(--radius)-6px)] border border-[var(--border)] bg-[var(--chart-tooltip-bg)] px-3 py-2 shadow-[var(--shadow-md)]">
      <p className="text-xs font-medium text-[var(--foreground-muted)]">{label}</p>
      <p className="mt-1 text-sm font-medium text-[var(--primary)]">
        {typeof value === "number" ? value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }) : value}
      </p>
    </div>
  );
}

// Single series — no legend box needed, the card title already names it
// (see the dataviz skill's guidance: "a single series needs no legend box
// — the title names it").
export function NetWorthHistoryChart({ data }: { data: NetWorthChartPoint[] }) {
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
            stroke="var(--foreground-muted)"
            tick={{ fill: "var(--foreground-muted)", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatCompact}
            width={56}
          />

          <Tooltip content={CustomTooltip} cursor={{ stroke: "var(--border)" }} />

          <Line
            type="monotone"
            dataKey="netWorth"
            name="Net Worth"
            stroke="var(--primary)"
            strokeWidth={2}
            dot={{ r: 3, fill: "var(--primary)", strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
