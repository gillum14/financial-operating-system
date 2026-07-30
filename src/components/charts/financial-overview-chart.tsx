"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipContentProps } from "recharts";

import type { CashFlowPoint } from "@/features/dashboard/types";

function formatCompact(value: number) {
  return `$${Math.round(value / 1000)}K`;
}

function CustomTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="rounded-[calc(var(--radius)-6px)] border border-[var(--border)] bg-[var(--chart-tooltip-bg)] px-3 py-2 shadow-[var(--shadow-md)]">
      <p className="text-xs font-medium text-[var(--foreground-muted)]">{label}</p>

      {payload.map((entry) => (
        <p key={entry.dataKey as string} className="mt-1 text-sm font-medium" style={{ color: entry.color }}>
          {entry.name}: ${entry.value?.toLocaleString()}
        </p>
      ))}
    </div>
  );
}

export function FinancialOverviewChart({ data }: { data: CashFlowPoint[] }) {
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
            width={48}
          />

          <Tooltip content={CustomTooltip} cursor={{ stroke: "var(--border)" }} />

          <Line
            type="monotone"
            dataKey="income"
            name="Income"
            stroke="var(--primary)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />

          <Line
            type="monotone"
            dataKey="expenses"
            name="Expenses"
            stroke="var(--foreground-muted)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function FinancialOverviewLegend() {
  return (
    <div className="flex items-center gap-4 text-sm">
      <span className="flex items-center gap-1.5 text-[var(--foreground-secondary)]">
        <span className="h-0.5 w-4 rounded-full bg-[var(--primary)]" />
        Income
      </span>

      <span className="flex items-center gap-1.5 text-[var(--foreground-secondary)]">
        <span className="h-0.5 w-4 rounded-full bg-[var(--foreground-muted)]" />
        Expenses
      </span>
    </div>
  );
}
