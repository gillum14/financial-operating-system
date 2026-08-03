import { RailCard } from "@/components/ui/rail-card";

// TECH DEBT: investment activity (buys, sells, dividends) has no domain
// model yet — no Investments schema, no activity log. Deliberately NOT
// backfilled from real Transactions data: an ordinary transaction was
// never designated as investment activity, and conflating the two would
// misrepresent it as something it isn't (same reasoning as Missions'
// RecentContributionsCard).
export function RecentActivityCard() {
  return (
    <RailCard
      title="Recent Activity"
      action={
        <button type="button" disabled title="Not available yet" className="cursor-not-allowed text-xs font-medium text-[var(--foreground-muted)] opacity-70">
          View all
        </button>
      }
    >
      <p className="text-sm text-[var(--foreground-secondary)]">No recent activity.</p>
    </RailCard>
  );
}
