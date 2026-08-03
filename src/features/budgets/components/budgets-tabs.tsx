"use client";

import type { ReactNode } from "react";

const DISABLED_TABS = ["Categories", "Recurring", "Adjustments", "History"] as const;

// TECH DEBT: every tab but Overview depends on a Budget domain that
// doesn't exist yet (budget-category allocations, recurring budget
// templates, an adjustment log, closed-period history — see
// docs/architecture/domain-model.md). Rendered as real, natively-disabled
// tab buttons (not omitted) so the page's section hierarchy matches the
// approved mockup, but there is no reachable panel behind them to fabricate
// content for.
export function BudgetsTabs({ children }: { children: ReactNode }) {
  return (
    <div>
      <div role="tablist" aria-label="Budget sections" className="flex gap-6 border-b border-[var(--border)]">
        <button
          type="button"
          role="tab"
          id="budgets-tab-overview"
          aria-selected="true"
          aria-controls="budgets-tabpanel-overview"
          className="relative -mb-px border-b-2 border-[var(--primary)] px-1 py-3 text-sm font-medium text-[var(--foreground)]"
        >
          Overview
        </button>

        {DISABLED_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected="false"
            disabled
            title="Not available yet"
            className="relative -mb-px cursor-not-allowed border-b-2 border-transparent px-1 py-3 text-sm font-medium text-[var(--foreground-muted)] opacity-70"
          >
            {tab}
          </button>
        ))}
      </div>

      <div role="tabpanel" id="budgets-tabpanel-overview" aria-labelledby="budgets-tab-overview" className="pt-6">
        {children}
      </div>
    </div>
  );
}
