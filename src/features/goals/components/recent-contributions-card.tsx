import type { GoalContributionRow } from "@/application/goals/goals-views";
import { RailCard } from "@/components/ui/rail-card";

import { ContributionRowControls } from "./contribution-row-controls";

function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function RecentContributionsCard({ contributions }: { contributions?: GoalContributionRow[] }) {
  if (!contributions || contributions.length === 0) {
    return (
      <RailCard title="Recent Contributions">
        <p className="text-sm text-[var(--foreground-secondary)]">No contributions yet.</p>
      </RailCard>
    );
  }

  return (
    <RailCard title="Recent Contributions">
      <ul className="space-y-3">
        {contributions.map((contribution) => (
          <li key={contribution.id} className="text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate font-medium text-[var(--foreground)]">{contribution.goalTitle}</span>
              <span className="shrink-0 text-xs font-medium text-[var(--success)]">+{formatCurrency(contribution.amount)}</span>
            </div>
            <p className="mt-0.5 text-xs text-[var(--foreground-muted)]">
              {contribution.dateLabel}
              {contribution.note ? ` · ${contribution.note}` : ""}
            </p>
            <ContributionRowControls
              contributionId={contribution.id}
              amount={contribution.amount}
              goalTitle={contribution.goalTitle}
            />
          </li>
        ))}
      </ul>
    </RailCard>
  );
}
