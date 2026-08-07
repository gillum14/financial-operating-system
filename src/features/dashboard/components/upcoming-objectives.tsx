import { Target } from "lucide-react";

import type { UpcomingObjectiveRow } from "@/application/goals/goals-views";
import Card from "@/components/ui/card";
import CardHeader from "@/components/ui/card-header";

// Goal-derived objectives (Issue #53) — see
// goal-calculations.ts's deriveUpcomingObjectives, the single canonical
// source both this widget and the Goals page itself would use. Each row is
// a real, active goal selected by a fixed, explainable rule (near
// completion, behind pace, an approaching target date, or a high-priority
// tag), never a fabricated or AI-generated suggestion.
export function UpcomingObjectives({ objectives }: { objectives: UpcomingObjectiveRow[] }) {
  if (objectives.length === 0) {
    return (
      <Card>
        <CardHeader title="Upcoming Objectives" />
        <p className="text-sm text-[var(--foreground-secondary)]">
          No goals currently need attention — nothing is behind pace, nearly funded, or approaching its target date.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader title="Upcoming Objectives">
        <a href="/goals" className="text-sm font-medium text-[var(--primary)] hover:underline">
          View all
        </a>
      </CardHeader>

      <ul className="space-y-4">
        {objectives.map((objective) => (
          <li key={objective.goalId} className="flex items-center gap-3">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[calc(var(--radius)-8px)]"
              style={{ backgroundColor: "color-mix(in srgb, var(--primary) 15%, transparent)", color: "var(--primary)" }}
            >
              <Target className="h-4 w-4" strokeWidth={1.75} />
            </span>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[var(--foreground)]">{objective.title}</p>
              <p className="truncate text-xs text-[var(--foreground-muted)]">{objective.reason}</p>
            </div>

            <div className="shrink-0 text-right">
              <p className="text-sm font-medium text-[var(--foreground)]">{Math.round(objective.percentCompleteDisplay)}%</p>
              <p className="mt-1 text-xs text-[var(--foreground-muted)]">funded</p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
