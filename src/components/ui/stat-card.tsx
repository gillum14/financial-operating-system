import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";

import Card from "./card";

type StatCardProps = {
  label: string;
  value: string;
  icon: LucideIcon;
  children?: ReactNode;
};

export default function StatCard({ label, value, icon: Icon, children }: StatCardProps) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        {/* min-w-0 lets this flex item shrink below its unwrapped text
            width — without it, a longer label in a narrower card (e.g.
            Missions' "Total Points" once its tile lost the full-width
            row) doesn't wrap; it just crowds the icon badge instead. */}
        <p className="min-w-0 text-xs font-semibold tracking-[0.12em] text-[var(--foreground-muted)] uppercase">
          {label}
        </p>

        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-hover)] text-[var(--foreground-secondary)]">
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

// For stat tiles whose value has no honestly-computable delta (no historical
// snapshot to compare against) — a caption with no fabricated arrow/percent.
export function StatCaption({ caption }: { caption: string }) {
  return <p className="text-xs text-[var(--foreground-muted)]">{caption}</p>;
}
