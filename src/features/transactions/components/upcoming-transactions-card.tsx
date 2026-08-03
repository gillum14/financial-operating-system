import { RailCard } from "@/components/ui/rail-card";

// TECH DEBT: recurring/scheduled transactions are not a concept that
// exists anywhere in the domain model yet — there's no schema, service, or
// detection logic behind "upcoming." Rendered as an honest empty state
// rather than the approved mockup's populated list, which would fabricate
// data. Revisit once a Recurring/Scheduled slice exists (see the disabled
// sidebar entries of the same name).
export function UpcomingTransactionsCard() {
  return (
    <RailCard title="Upcoming Transactions">
      <p className="text-sm text-[var(--foreground-secondary)]">No upcoming transactions available.</p>
      <p className="mt-1 text-xs text-[var(--foreground-muted)]">Recurring and scheduled transactions are not supported yet.</p>
    </RailCard>
  );
}
