import { RailCard } from "@/components/ui/rail-card";

// TECH DEBT: a contribution (money added toward a specific goal) has no
// domain model yet — no Goals, no contribution log. This is deliberately
// NOT the same thing as a Transaction; conflating them would misrepresent
// a regular transaction as a goal contribution that was never designated
// as one.
export function RecentContributionsCard() {
  return (
    <RailCard
      title="Recent Contributions"
      action={
        <button type="button" disabled title="Not available yet" className="cursor-not-allowed text-xs font-medium text-[var(--foreground-muted)] opacity-70">
          View all
        </button>
      }
    >
      <p className="text-sm text-[var(--foreground-secondary)]">No contributions yet.</p>
    </RailCard>
  );
}
