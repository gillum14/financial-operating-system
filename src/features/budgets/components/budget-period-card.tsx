import { ChevronDown } from "lucide-react";

import { RailCard } from "@/components/ui/rail-card";

// TECH DEBT: budget periods (a defined start/end cycle a budget activates
// against) don't exist yet — no Budget domain. The mockup's period picker
// is rendered disabled rather than omitted, since removing it would shift
// the rail's established hierarchy.
export function BudgetPeriodCard() {
  return (
    <RailCard title="Budget Period">
      <button
        type="button"
        disabled
        title="No budget period is active yet"
        className="flex w-full cursor-not-allowed items-center justify-between rounded-[calc(var(--radius)-8px)] border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--foreground-muted)] opacity-70"
      >
        No active budget period
        <ChevronDown className="h-4 w-4" strokeWidth={2} />
      </button>
    </RailCard>
  );
}
