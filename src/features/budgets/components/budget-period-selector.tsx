"use client";

import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";

import type { BudgetPeriodOption } from "@/application/budgets/budgets-views";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  active: "Active",
  completed: "Completed",
  archived: "Archived",
};

// URL-driven selection (?period=<id>), read server-side by the Budgets
// page and passed to getBudgetsOverview — the same "state lives in the
// URL, not client state" convention Transactions/Reports use for their
// own filter controls, so a selected period survives a refresh or a
// shared link.
export function BudgetPeriodSelector({
  currentPeriodId,
  periods,
}: {
  currentPeriodId: string;
  periods: BudgetPeriodOption[];
}) {
  const router = useRouter();

  return (
    <div className="relative">
      <select
        aria-label="Select budget period"
        value={currentPeriodId}
        onChange={(event) => router.push(`/budgets?period=${event.target.value}`)}
        className="w-full appearance-none rounded-[calc(var(--radius)-8px)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 pr-8 text-sm font-medium text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
      >
        {periods.map((period) => (
          <option key={period.id} value={period.id}>
            {period.label} · {STATUS_LABEL[period.status] ?? period.status}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 text-[var(--foreground-muted)]"
        strokeWidth={2}
      />
    </div>
  );
}
