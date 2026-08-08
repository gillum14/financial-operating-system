import { Sparkles } from "lucide-react";

import type { MissionImpactSummary } from "@/application/missions/missions-views";
import Card from "@/components/ui/card";
import CardHeader from "@/components/ui/card-header";

// Every number here comes straight from MissionImpactSummary
// (missions-query.ts's computeImpactSummary) — aggregated only from the
// owner's own completed missions' own real, recorded before/after values.
// Never a re-attribution of ordinary Transactions/Goals activity: the
// original placeholder version of this card explicitly refused to
// fabricate that link, and this version still doesn't — it only ever
// summarizes missions this owner actually started and completed.
export function MissionImpactCard({ summary }: { summary: MissionImpactSummary }) {
  return (
    <Card>
      <CardHeader title="Mission Impact" />

      {summary.completedCount === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[calc(var(--radius)-8px)] border border-dashed border-[var(--border)] px-6 py-8 text-center">
          <Sparkles className="h-6 w-6 text-[var(--foreground-muted)]" strokeWidth={1.5} />
          <p className="mt-3 text-sm font-medium text-[var(--foreground-secondary)]">No mission impact yet</p>
          <p className="mt-1 max-w-xs text-xs text-[var(--foreground-muted)]">
            Complete a mission to see its real, real-dollar impact here.
          </p>
        </div>
      ) : (
        <dl className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-[var(--foreground-muted)]">Missions completed</dt>
            <dd className="font-medium text-[var(--foreground)]">{summary.completedCount}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-[var(--foreground-muted)]">Debt paid off</dt>
            <dd className="font-medium text-[var(--foreground)]">{summary.totalDebtPaidOffLabel}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-[var(--foreground-muted)]">Funded toward goals</dt>
            <dd className="font-medium text-[var(--foreground)]">{summary.totalGoalsFundedLabel}</dd>
          </div>
        </dl>
      )}
    </Card>
  );
}
