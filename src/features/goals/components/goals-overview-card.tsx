import { ChevronDown, Plus, Target } from "lucide-react";

import Card from "@/components/ui/card";
import CardHeader from "@/components/ui/card-header";

// TECH DEBT: filtering/sorting a goals list only makes sense once goals
// exist — no Goals domain yet, so both controls are disabled rather than
// wired to a filter that would have nothing to filter.
function DisabledDropdown({ label }: { label: string }) {
  return (
    <button
      type="button"
      disabled
      title="Not available yet"
      className="flex cursor-not-allowed items-center gap-1.5 rounded-[calc(var(--radius)-8px)] border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--foreground-muted)] opacity-70"
    >
      {label}
      <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />
    </button>
  );
}

export function GoalsOverviewCard({ hasGoals }: { hasGoals: boolean }) {
  if (hasGoals) {
    // Unreachable today (hasGoals is always false — see goals-query.ts),
    // kept as the real-data branch this component will take once a Goals
    // domain exists, so this file doesn't need a rewrite at that point.
    return null;
  }

  return (
    <Card>
      <CardHeader title="Goals Overview">
        <div className="flex items-center gap-3">
          <DisabledDropdown label="All Goals" />
          <DisabledDropdown label="Sort: Progress" />
        </div>
      </CardHeader>

      <div className="flex flex-col items-center justify-center rounded-[calc(var(--radius)-8px)] border border-dashed border-[var(--border)] px-6 py-12 text-center">
        <Target className="h-6 w-6 text-[var(--foreground-muted)]" strokeWidth={1.5} />
        <p className="mt-3 text-sm font-medium text-[var(--foreground-secondary)]">No goals created yet</p>
        <p className="mt-1 max-w-xs text-xs text-[var(--foreground-muted)]">
          Create a goal to start tracking progress toward what matters to you.
        </p>
      </div>

      <button
        type="button"
        disabled
        title="Creating goals isn't available yet"
        className="mt-4 flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-[calc(var(--radius)-8px)] border border-dashed border-[var(--border)] px-4 py-3 text-sm font-medium text-[var(--foreground-muted)] opacity-70"
      >
        <Plus className="h-4 w-4" strokeWidth={1.75} />
        Create your next goal
      </button>
    </Card>
  );
}
