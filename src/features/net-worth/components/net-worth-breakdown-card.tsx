import { RailCard } from "@/components/ui/rail-card";
import type { NetWorthCategoryItem } from "@/application/net-worth/net-worth-views";
import { categoryTone } from "@/lib/category-color";

import { formatCurrency } from "../format";

// Compact rail summary of the same real category breakdown the main
// Assets by Category card shows (see net-worth-breakdown.ts) — reused,
// not recomputed, so the two can never disagree. Percentages here are
// each category's share of total assets (the same value the main card
// shows), plus one combined liabilities line — not a separate "share of
// net worth" computation, which would be a second, easy-to-drift
// definition of the same numbers.
export function NetWorthBreakdownCard({
  netWorth,
  totalLiabilities,
  assetsByCategory,
  hasAccounts,
}: {
  netWorth: number;
  totalLiabilities: number;
  assetsByCategory: NetWorthCategoryItem[];
  hasAccounts: boolean;
}) {
  return (
    <RailCard
      title="Net Worth Breakdown"
      action={
        <button
          type="button"
          disabled
          title="Not available yet"
          className="cursor-not-allowed text-xs font-medium text-[var(--foreground-muted)] opacity-70"
        >
          View details
        </button>
      }
    >
      {!hasAccounts ? (
        <>
          <p className="text-sm text-[var(--foreground-secondary)]">No accounts yet.</p>
          <p className="mt-1 text-xs text-[var(--foreground-muted)]">This will appear once you add an account.</p>
        </>
      ) : (
        <>
          <p className="text-xl font-semibold text-[var(--foreground)]">{formatCurrency(netWorth)}</p>
          <p className="text-xs text-[var(--foreground-muted)]">Net Worth</p>

          <ul className="mt-3 space-y-2">
            {assetsByCategory.map((item) => {
              const tone = categoryTone(item.label);
              return (
                <li key={item.accountType} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-[var(--foreground-secondary)]">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: tone }} />
                    {item.label}
                  </span>
                  <span className="text-[var(--foreground)]">{Math.round(item.percent)}%</span>
                </li>
              );
            })}
            <li className="flex items-center justify-between border-t border-[var(--border-subtle)] pt-2 text-xs">
              <span className="flex items-center gap-1.5 text-[var(--foreground-secondary)]">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--danger)]" />
                Liabilities
              </span>
              <span className="text-[var(--danger)]">-{formatCurrency(totalLiabilities)}</span>
            </li>
          </ul>
        </>
      )}
    </RailCard>
  );
}
