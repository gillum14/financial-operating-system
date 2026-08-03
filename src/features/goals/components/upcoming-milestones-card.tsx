import { RailCard } from "@/components/ui/rail-card";

// TECH DEBT: milestones (a partial-progress checkpoint within a goal, with
// its own target amount/date) have no domain model yet — no Goals, no
// milestone table.
export function UpcomingMilestonesCard() {
  return (
    <RailCard
      title="Upcoming Milestones"
      action={
        <button type="button" disabled title="Not available yet" className="cursor-not-allowed text-xs font-medium text-[var(--foreground-muted)] opacity-70">
          View all
        </button>
      }
    >
      <p className="text-sm text-[var(--foreground-secondary)]">No upcoming milestones.</p>
    </RailCard>
  );
}
