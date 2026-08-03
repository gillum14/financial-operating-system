import { RailCard } from "@/components/ui/rail-card";

// TECH DEBT: budget adjustments (a logged change to a category's allocation
// mid-period) have no domain model yet — no Budget, no adjustment log.
export function RecentAdjustmentsCard() {
  return (
    <RailCard
      title="Recent Adjustments"
      action={
        <button type="button" disabled title="Not available yet" className="cursor-not-allowed text-xs font-medium text-[var(--foreground-muted)] opacity-70">
          View all
        </button>
      }
    >
      <p className="text-sm text-[var(--foreground-secondary)]">No adjustments yet.</p>
    </RailCard>
  );
}
