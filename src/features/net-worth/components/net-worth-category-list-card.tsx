import Card from "@/components/ui/card";
import CardHeader from "@/components/ui/card-header";
import ProgressBar from "@/components/ui/progress-bar";
import type { CategoryBalanceChange, NetWorthCategoryItem } from "@/application/net-worth/net-worth-views";
import { categoryTone } from "@/lib/category-color";
import { AccountIcon } from "@/features/accounts/components/account-icon";
import { getAccountPresentation } from "@/application/dashboard/account-presentation";

import { formatCurrency } from "../format";

// Shared shell for the Assets by Category / Liabilities by Category cards
// — same real category-breakdown data, just two different sides of the
// same computation (see net-worth-breakdown.ts). Reuses AccountIcon (the
// same account-type-to-icon mapping the Accounts workspace already uses)
// rather than inventing a second icon system for this page.
export function NetWorthCategoryListCard({
  title,
  totalLabel,
  items,
  total,
  emptyText,
  changes,
}: {
  title: string;
  totalLabel: string;
  items: NetWorthCategoryItem[];
  total: number;
  emptyText: string;
  // Category-level change since the last historical snapshot (task §4:
  // "category-level asset/liability change where existing presentation
  // supports it") — empty when there's no comparison point yet, in which
  // case no delta badge renders, same honest-omission behavior as every
  // other delta on this page.
  changes?: CategoryBalanceChange[];
}) {
  const changeByType = new Map((changes ?? []).map((change) => [change.accountType, change]));
  return (
    <Card>
      <CardHeader title={title}>
        <button
          type="button"
          disabled
          title="Not available yet"
          className="cursor-not-allowed text-sm font-medium text-[var(--foreground-muted)] opacity-70"
        >
          View all
        </button>
      </CardHeader>

      {items.length === 0 ? (
        <p className="text-sm text-[var(--foreground-secondary)]">{emptyText}</p>
      ) : (
        <>
          <ul className="space-y-4">
            {items.map((item) => {
              const tone = categoryTone(item.label);
              const { group } = getAccountPresentation(item.accountType);
              const change = changeByType.get(item.accountType);
              return (
                <li key={item.accountType}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2.5 text-[var(--foreground-secondary)]">
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                        style={{ backgroundColor: `color-mix(in srgb, ${tone} 16%, transparent)`, color: tone }}
                      >
                        <AccountIcon group={group} className="h-3.5 w-3.5" />
                      </span>
                      {item.label}
                    </span>
                    <span className="flex items-center gap-3 text-[var(--foreground)]">
                      {change && change.absoluteChange !== 0 && (
                        <span className={change.absoluteChange > 0 ? "text-xs text-[var(--success)]" : "text-xs text-[var(--danger)]"}>
                          {change.absoluteChange > 0 ? "+" : "-"}
                          {formatCurrency(Math.abs(change.absoluteChange))}
                        </span>
                      )}
                      {formatCurrency(item.amount)}
                      <span className="w-10 text-right text-[var(--foreground-muted)]">{Math.round(item.percent)}%</span>
                    </span>
                  </div>
                  <ProgressBar percent={item.percent} color={tone} className="mt-1.5 ml-[38px] w-[calc(100%-38px)]" />
                </li>
              );
            })}
          </ul>

          <div className="mt-4 flex items-center justify-between border-t border-[var(--border-subtle)] pt-3 text-sm font-semibold">
            <span className="text-[var(--foreground)]">{totalLabel}</span>
            <span className="text-[var(--foreground)]">{formatCurrency(total)}</span>
          </div>
        </>
      )}
    </Card>
  );
}
