import { ChevronDown } from "lucide-react";

import { RailCard } from "@/components/ui/rail-card";

// TECH DEBT: an estimated retirement-income breakdown (Social Security +
// retirement-account withdrawals, in today's dollars) requires a
// forecasting engine and Social Security estimate this app doesn't have.
// No fabricated dollar amounts or percentage splits invented.
export function RetirementIncomeBreakdownCard() {
  return (
    <RailCard
      title="Retirement Income Breakdown"
      action={
        <button
          type="button"
          disabled
          title="Not available yet"
          className="flex cursor-not-allowed items-center gap-1 text-xs font-medium text-[var(--foreground-muted)] opacity-70"
        >
          At retirement
          <ChevronDown className="h-3 w-3" strokeWidth={2} />
        </button>
      }
    >
      <p className="text-sm text-[var(--foreground-secondary)]">Income estimates aren&apos;t available yet.</p>
      <p className="mt-1 text-xs text-[var(--foreground-muted)]">This will appear once a retirement plan exists.</p>
    </RailCard>
  );
}
