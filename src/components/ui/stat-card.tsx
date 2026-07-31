import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";

import Card from "./card";

type StatCardProps = {
  label: string;
  value: string;
  icon: LucideIcon;
  children?: ReactNode;
  className?: string;
};

export default function StatCard({ label, value, icon: Icon, children, className = "" }: StatCardProps) {
  return (
    <Card className={className}>
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold tracking-[0.12em] text-[var(--foreground-muted)] uppercase">
          {label}
        </p>

        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--surface-hover)] text-[var(--foreground-secondary)]">
          <Icon className="h-4 w-4" strokeWidth={1.75} />
        </span>
      </div>

      <p className="mt-2 text-3xl font-semibold tracking-tight text-[var(--foreground)]">{value}</p>

      {children && <div className="mt-2">{children}</div>}
    </Card>
  );
}

type StatDeltaProps = {
  deltaLabel: string;
  positive: boolean;
  caption: string;
};

export function StatDelta({ deltaLabel, positive, caption }: StatDeltaProps) {
  const Icon = positive ? ArrowUpRight : ArrowDownRight;

  return (
    <div>
      <p
        className={`flex items-center gap-1 text-sm font-medium ${
          positive ? "text-[var(--success)]" : "text-[var(--danger)]"
        }`}
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={2} />
        {deltaLabel}
      </p>

      <p className="mt-1 text-xs text-[var(--foreground-muted)]">{caption}</p>
    </div>
  );
}
