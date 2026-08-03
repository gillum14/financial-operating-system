import { RailCard } from "@/components/ui/rail-card";

// TECH DEBT: individual holdings (ticker/fund, shares, market value) have
// no domain model yet — no Investments schema, repository, or service. No
// fabricated positions, logos, or values rendered here.
export function TopHoldingsCard() {
  return (
    <RailCard
      title="Top Holdings"
      action={
        <button type="button" disabled title="Not available yet" className="cursor-not-allowed text-xs font-medium text-[var(--foreground-muted)] opacity-70">
          View all holdings
        </button>
      }
    >
      <p className="text-sm text-[var(--foreground-secondary)]">No holdings yet.</p>
    </RailCard>
  );
}
