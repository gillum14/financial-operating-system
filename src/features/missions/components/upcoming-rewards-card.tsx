import { RailCard } from "@/components/ui/rail-card";

// TECH DEBT: rewards (level unlocks, point-redeemable perks) require a
// Missions domain that doesn't exist yet — no fake reward names or "X to
// go" progress invented.
export function UpcomingRewardsCard() {
  return (
    <RailCard
      title="Upcoming Rewards"
      action={
        <button type="button" disabled title="Not available yet" className="cursor-not-allowed text-xs font-medium text-[var(--foreground-muted)] opacity-70">
          View all
        </button>
      }
    >
      <p className="text-sm text-[var(--foreground-secondary)]">No rewards available yet.</p>
    </RailCard>
  );
}
