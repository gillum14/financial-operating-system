"use client";

import type { ReactNode } from "react";

const DISABLED_TABS = ["Holdings", "Performance", "Accounts", "Transactions", "Analysis"] as const;

// TECH DEBT: every tab but Overview depends on an Investments domain that
// doesn't exist yet (individual holdings/positions, performance history,
// a dedicated investment-accounts view, an investment-activity log,
// allocation analysis). Rendered as real, natively-disabled tab buttons
// (not omitted) so the page's section hierarchy matches the approved
// mockup, but there is no reachable panel behind them to fabricate
// content for. Same pattern as Budgets'/Goals'/Missions' tabs.
export function InvestmentsTabs({ children }: { children: ReactNode }) {
  return (
    <div>
      <div role="tablist" aria-label="Investment sections" className="flex flex-wrap gap-6 border-b border-[var(--border)]">
        <button
          type="button"
          role="tab"
          id="investments-tab-overview"
          aria-selected="true"
          aria-controls="investments-tabpanel-overview"
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

      <div role="tabpanel" id="investments-tabpanel-overview" aria-labelledby="investments-tab-overview" className="pt-6">
        {children}
      </div>
    </div>
  );
}
