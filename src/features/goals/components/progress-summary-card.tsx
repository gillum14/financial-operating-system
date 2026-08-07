import type { GoalHealthSummary } from "@/application/goals/goals-views";
import { RailCard } from "@/components/ui/rail-card";
import { goalHealthTone } from "@/lib/goal-presentation";

const ROWS: { key: keyof GoalHealthSummary; label: string; health: "excellent" | "on-track" | "behind" | "completed" }[] = [
  { key: "excellent", label: "Excellent", health: "excellent" },
  { key: "onTrack", label: "On Track", health: "on-track" },
  { key: "behind", label: "Behind", health: "behind" },
  { key: "completed", label: "Completed", health: "completed" },
];

export function ProgressSummaryCard({ healthSummary }: { healthSummary?: GoalHealthSummary }) {
  if (!healthSummary) {
    return (
      <RailCard title="Progress Summary">
        <p className="text-sm text-[var(--foreground-secondary)]">Progress tracking isn&apos;t available yet.</p>
        <p className="mt-1 text-xs text-[var(--foreground-muted)]">This will appear once goals exist.</p>
      </RailCard>
    );
  }

  return (
    <RailCard title="Progress Summary">
      <dl className="space-y-2.5 text-sm">
        {ROWS.map((row) => (
          <div key={row.key} className="flex items-center justify-between">
            <dt className="text-[var(--foreground-secondary)]">{row.label}</dt>
            <dd className="font-medium" style={{ color: goalHealthTone(row.health) }}>
              {healthSummary[row.key]}
            </dd>
          </div>
        ))}
      </dl>
    </RailCard>
  );
}
