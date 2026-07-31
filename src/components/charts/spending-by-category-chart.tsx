"use client";

import { Pie, PieChart, ResponsiveContainer, Sector, Tooltip } from "recharts";
import type { PieSectorShapeProps, TooltipContentProps } from "recharts";

import type { CategorySpend } from "@/features/dashboard/types";

function CategorySector(props: PieSectorShapeProps) {
  const category = props.payload as CategorySpend;
  return <Sector {...props} fill={category.color} />;
}

function CustomTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const entry = payload[0];
  const category = entry.payload as CategorySpend;

  return (
    <div className="max-w-[9.5rem] rounded-[calc(var(--radius)-6px)] border border-[var(--border)] bg-[var(--chart-tooltip-bg)] px-2.5 py-1.5 shadow-[var(--shadow-md)]">
      <p className="truncate text-sm font-medium" style={{ color: category.color }}>
        {category.category}
      </p>
      <p className="mt-0.5 text-xs text-[var(--foreground-muted)]">
        ${category.amount.toLocaleString()} · {category.percent}%
      </p>
    </div>
  );
}

export function SpendingByCategoryChart({
  data,
  total,
}: {
  data: CategorySpend[];
  total: number;
}) {
  return (
    <div className="relative h-32 w-32 shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="amount"
            nameKey="category"
            innerRadius="68%"
            outerRadius="100%"
            paddingAngle={2}
            stroke="var(--surface)"
            strokeWidth={2}
            shape={CategorySector}
            activeShape={false}
          />

          <Tooltip
            content={CustomTooltip}
            allowEscapeViewBox={{ x: true, y: true }}
            position={{ x: 4, y: 118 }}
            isAnimationActive={false}
            wrapperStyle={{ zIndex: 20 }}
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-lg font-semibold tracking-tight text-[var(--foreground)]">
          ${total.toLocaleString()}
        </p>
        <p className="text-[10px] text-[var(--foreground-muted)]">Total</p>
      </div>
    </div>
  );
}

export function CategoryLegendTable({ data }: { data: CategorySpend[] }) {
  return (
    <ul className="min-w-0 flex-1 space-y-3">
      {data.map((entry) => (
        <li key={entry.category} className="flex items-center gap-2 text-sm">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
          <span
            title={entry.category}
            className="min-w-0 flex-1 truncate text-[var(--foreground-secondary)]"
          >
            {entry.category}
          </span>
          <span className="shrink-0 font-medium text-[var(--foreground)]">
            ${entry.amount.toLocaleString()}
          </span>
          <span className="w-8 shrink-0 text-right text-[var(--foreground-muted)]">{entry.percent}%</span>
        </li>
      ))}
    </ul>
  );
}
