import { Home, Landmark, ShieldCheck, Zap, type LucideIcon } from "lucide-react";

import Card from "@/components/ui/card";
import CardHeader from "@/components/ui/card-header";
import type { UpcomingObjective } from "@/features/dashboard/types";

const OBJECTIVE_PRESENTATION: Record<string, { icon: LucideIcon; tone: string }> = {
  mortgage: { icon: Home, tone: "var(--danger)" },
  "car-insurance": { icon: ShieldCheck, tone: "var(--warning)" },
  electric: { icon: Zap, tone: "var(--warning)" },
  salary: { icon: Landmark, tone: "var(--primary)" },
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
          const presentation = OBJECTIVE_PRESENTATION[objective.id];
          const Icon = presentation?.icon ?? Landmark;
          const tone = presentation?.tone ?? "var(--foreground-muted)";

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
                <p
                  className="mt-1 text-sm font-medium"
                  style={{ color: objective.amount < 0 ? "var(--warning)" : "var(--success)" }}
                >
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
