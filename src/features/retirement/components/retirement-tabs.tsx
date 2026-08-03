"use client";

import type { ReactNode } from "react";

const DISABLED_TABS = ["Accounts", "Contributions", "Projections", "Analysis", "Documents"] as const;

// TECH DEBT: every tab but Overview depends on a Retirement domain that
// doesn't exist yet (a dedicated retirement-accounts view, a contribution
// log, long-range projections, scenario analysis, document storage).
// Rendered as real, natively-disabled tab buttons (not omitted) so the
// page's section hierarchy matches the approved mockup, but there is no
// reachable panel behind them to fabricate content for. Same pattern as
// Budgets'/Goals'/Missions'/Investments' tabs.
export function RetirementTabs({ children }: { children: ReactNode }) {
  return (
    <div>
      <div role="tablist" aria-label="Retirement sections" className="flex flex-wrap gap-6 border-b border-[var(--border)]">
        <button
          type="button"
          role="tab"
          id="retirement-tab-overview"
          aria-selected="true"
          aria-controls="retirement-tabpanel-overview"
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

      <div role="tabpanel" id="retirement-tabpanel-overview" aria-labelledby="retirement-tab-overview" className="pt-6">
        {children}
      </div>
    </div>
  );
}
