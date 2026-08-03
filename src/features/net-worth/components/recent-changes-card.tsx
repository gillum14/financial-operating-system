import { RailCard } from "@/components/ui/rail-card";

// TECH DEBT: attributing a balance change to a specific cause ("Market
// Gains", "Additional Payment") requires a historical change log this app
// doesn't store — only the current balance of each account is known.
// Deliberately NOT derived from real Transactions data: a transaction
// against one account doesn't by itself explain a net-worth-level change
// (transfers, balance corrections, and multi-account effects would all
// need to be reconciled first), so guessing would risk misattributing a
// real number to the wrong cause.
export function RecentChangesCard() {
  return (
    <RailCard
      title="Recent Changes"
      action={
        <button type="button" disabled title="Not available yet" className="cursor-not-allowed text-xs font-medium text-[var(--foreground-muted)] opacity-70">
          View all
        </button>
      }
    >
      <p className="text-sm text-[var(--foreground-secondary)]">No recent changes.</p>
    </RailCard>
  );
}
