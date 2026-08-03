"use client";

import type { ReactNode } from "react";

const DISABLED_TABS = ["Spending", "Income", "Cash Flow", "Net Worth", "Trends", "Tax", "Custom"] as const;

// TECH DEBT: every tab but Overview would need its own dedicated report
// (a full Spending report, a Net Worth report — which itself depends on
// the not-yet-built Net Worth domain — etc.), none of which exist yet.
// Rendered as real, natively-disabled tab buttons (not omitted) so the
// page's section hierarchy matches the approved mockup, but there is no
// reachable panel behind them to fabricate content for. Same pattern as
// Budgets' BudgetsTabs.
export function ReportsTabs({ action, children }: { action?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-4 border-b border-[var(--border)]">
        <div role="tablist" aria-label="Report sections" className="flex flex-wrap gap-6">
          <button
            type="button"
            role="tab"
            id="reports-tab-overview"
            aria-selected="true"
            aria-controls="reports-tabpanel-overview"
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

        {action && <div className="shrink-0 pb-3">{action}</div>}
      </div>

      <div role="tabpanel" id="reports-tabpanel-overview" aria-labelledby="reports-tab-overview" className="pt-6">
        {children}
      </div>
    </div>
  );
}
