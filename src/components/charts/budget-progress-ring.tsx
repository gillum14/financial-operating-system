"use client";

import { Pie, PieChart, ResponsiveContainer, Sector } from "recharts";
import type { PieSectorShapeProps } from "recharts";

type RingSegment = { name: string; value: number; color: string };

function RingSector(props: PieSectorShapeProps) {
  const segment = props.payload as RingSegment;
  return <Sector {...props} fill={segment.color} />;
}

export function BudgetProgressRing({ percent }: { percent: number }) {
  const clamped = Math.min(100, Math.max(0, percent));
  const data: RingSegment[] = [
    { name: "spent", value: clamped, color: "var(--primary)" },
    { name: "remaining", value: 100 - clamped, color: "var(--surface-hover)" },
  ];

  return (
    <div className="relative h-40 w-40 shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            innerRadius="72%"
            outerRadius="100%"
            startAngle={90}
            endAngle={-270}
            cornerRadius={8}
            stroke="none"
            shape={RingSector}
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">{clamped}%</p>
        <p className="text-xs text-[var(--foreground-muted)]">of budget</p>
      </div>
    </div>
  );
}
