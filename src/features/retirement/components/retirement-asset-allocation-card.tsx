import { ChevronDown } from "lucide-react";

import { RailCard } from "@/components/ui/rail-card";

// TECH DEBT: allocation and risk level (share of portfolio by asset
// class, a conservative/moderate/aggressive setting) are derived from
// real retirement holdings that don't exist yet — no fake percentages,
// donut chart, or risk slider invented (same reasoning as Investments'
// AssetAllocationCard).
export function RetirementAssetAllocationCard() {
  return (
    <RailCard
      title="Asset Allocation"
      action={
        <button
          type="button"
          disabled
          title="Not available yet"
          className="flex cursor-not-allowed items-center gap-1 text-xs font-medium text-[var(--foreground-muted)] opacity-70"
        >
          Current
          <ChevronDown className="h-3 w-3" strokeWidth={2} />
        </button>
      }
    >
      <p className="text-sm text-[var(--foreground-secondary)]">Allocation isn&apos;t available yet.</p>
      <p className="mt-1 text-xs text-[var(--foreground-muted)]">This will appear once retirement accounts exist.</p>
    </RailCard>
  );
}
