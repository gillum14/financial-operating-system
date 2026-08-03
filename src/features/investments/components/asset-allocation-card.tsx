import { RailCard } from "@/components/ui/rail-card";

// TECH DEBT: allocation (share of portfolio value by asset class/holding)
// is derived from real holdings data that doesn't exist yet — no fake
// percentages or donut chart invented (same reasoning as Budgets'
// OnTrackCard and Goals' ProgressSummaryCard).
export function AssetAllocationCard() {
  return (
    <RailCard title="Asset Allocation">
      <p className="text-sm text-[var(--foreground-secondary)]">Allocation isn&apos;t available yet.</p>
      <p className="mt-1 text-xs text-[var(--foreground-muted)]">This will appear once holdings exist.</p>
    </RailCard>
  );
}
