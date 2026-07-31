import { Home, Landmark, ShieldCheck, Zap, type LucideIcon } from "lucide-react";

import Card from "@/components/ui/card";
import CardHeader from "@/components/ui/card-header";
import type { UpcomingObjective } from "@/features/dashboard/types";

const OBJECTIVE_ICON: Record<string, LucideIcon> = {
  mortgage: Home,
  "car-insurance": ShieldCheck,
  electric: Zap,
  salary: Landmark,
};

function formatAmount(amount: number) {
  const sign = amount < 0 ? "-" : "+";
  const formatted = Math.abs(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${sign}$${formatted}`;
}

export function UpcomingObjectives({ objectives }: { objectives: UpcomingObjective[] }) {
  return (
    <Card>
      <CardHeader title="Upcoming Objectives">
        <a href="#" className="text-sm font-medium text-[var(--primary)] hover:underline">
          View all
        </a>
      </CardHeader>

      <ul className="space-y-4">
        {objectives.map((objective) => {
          const Icon = OBJECTIVE_ICON[objective.id] ?? Landmark;
          const tone = objective.amount < 0 ? "var(--warning)" : "var(--success)";

          return (
            <li key={objective.id} className="flex items-center gap-3">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[calc(var(--radius)-8px)]"
                style={{ backgroundColor: `color-mix(in srgb, ${tone} 15%, transparent)`, color: tone }}
              >
                <Icon className="h-4 w-4" strokeWidth={1.75} />
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[var(--foreground)]">{objective.title}</p>
                <p className="truncate text-xs text-[var(--foreground-muted)]">{objective.subtitle}</p>
              </div>

              <div className="shrink-0 text-right">
                <p className="text-xs text-[var(--foreground-muted)]">{objective.dueDate}</p>
                <p className="mt-1 text-sm font-medium" style={{ color: tone }}>
                  {formatAmount(objective.amount)}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
