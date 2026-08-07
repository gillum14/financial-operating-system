import { RailCard } from "@/components/ui/rail-card";
import type { AccountBalanceChange } from "@/application/net-worth/net-worth-views";

import { formatCurrency } from "../format";

// Real account-level balance changes since the most recent historical
// snapshot (see net-worth-history-calculations.ts's computeAccountBalance
// Changes) — the top 5 by magnitude. Deliberately NOT attributed to a
// cause ("Market Gains", "Additional Payment"): that would require a
// historical change log this app doesn't store, and a transaction against
// one account doesn't by itself explain a balance-level change (transfers,
// corrections, multi-account effects). This shows WHAT changed and by how
// much — a real, honest number — not WHY.
export function RecentChangesCard({ changes }: { changes: AccountBalanceChange[] }) {
  const topChanges = changes.slice(0, 5);

  return (
    <RailCard
      title="Recent Changes"
      action={
        <button type="button" disabled title="Not available yet" className="cursor-not-allowed text-xs font-medium text-[var(--foreground-muted)] opacity-70">
          View all
        </button>
      }
    >
      {topChanges.length === 0 ? (
        <p className="text-sm text-[var(--foreground-secondary)]">
          No recent changes — this appears once you have at least two historical snapshots to compare.
        </p>
      ) : (
        <ul className="space-y-3">
          {topChanges.map((change) => (
            <li key={change.accountId} className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0 truncate text-[var(--foreground-secondary)]">{change.accountName}</span>
              <span
                className={`shrink-0 font-medium ${change.absoluteChange >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}`}
              >
                {change.absoluteChange >= 0 ? "+" : "-"}
                {formatCurrency(Math.abs(change.absoluteChange))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </RailCard>
  );
}
