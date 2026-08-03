import { RailCard } from "@/components/ui/rail-card";

// TECH DEBT: scheduled/upcoming contributions (including employer match)
// require a contribution schedule this app has never modeled — no
// Retirement domain, no recurring-contribution log. Deliberately NOT
// backfilled from real Transactions data: an ordinary transaction was
// never designated as a retirement contribution, and conflating the two
// would misrepresent it as something it isn't (same reasoning as
// Missions' RecentContributionsCard).
export function UpcomingContributionsCard() {
  return (
    <RailCard
      title="Upcoming Contributions"
      action={
        <button type="button" disabled title="Not available yet" className="cursor-not-allowed text-xs font-medium text-[var(--foreground-muted)] opacity-70">
          View all
        </button>
      }
    >
      <p className="text-sm text-[var(--foreground-secondary)]">No upcoming contributions.</p>
    </RailCard>
  );
}
