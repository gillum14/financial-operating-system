import { CreditCard, Target, TrendingUp, Wallet } from "lucide-react";

import StatCard, { StatCaption, StatDelta } from "@/components/ui/stat-card";
import type { NetWorthChange } from "@/application/net-worth/net-worth-views";

import { formatCurrency, formatStatDelta } from "../format";

// Net Worth / Total Assets / Total Liabilities are REAL — computed from
// the owner's active Accounts (see net-worth-query.ts). Deltas are REAL
// too once a historical snapshot exists to compare against; until then
// each tile shows an honest "Current balance" caption rather than a
// fabricated 0% or invented comparison.
//
// TECH DEBT: Net Worth Goal has no domain — no user-set target amount,
// no link to Goals. Honest placeholder, not the approved mockup's
// "$1,000,000.00 / 49% of goal".
export function NetWorthSummaryMetrics({
  netWorth,
  totalAssets,
  totalLiabilities,
  hasAccounts,
  netWorthChange,
  totalAssetsChange,
  totalLiabilitiesChange,
}: {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  hasAccounts: boolean;
  netWorthChange: NetWorthChange | null;
  totalAssetsChange: NetWorthChange | null;
  totalLiabilitiesChange: NetWorthChange | null;
}) {
  const caption = hasAccounts ? "Current balance" : "No accounts yet";

  return (
    <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Net Worth" value={hasAccounts ? formatCurrency(netWorth) : "—"} icon={TrendingUp}>
        {netWorthChange ? <StatDelta {...formatStatDelta(netWorthChange)} /> : <StatCaption caption={caption} />}
      </StatCard>

      <StatCard label="Total Assets" value={hasAccounts ? formatCurrency(totalAssets) : "—"} icon={Wallet}>
        {totalAssetsChange ? <StatDelta {...formatStatDelta(totalAssetsChange)} /> : <StatCaption caption={caption} />}
      </StatCard>

      <StatCard label="Total Liabilities" value={hasAccounts ? formatCurrency(totalLiabilities) : "—"} icon={CreditCard}>
        {totalLiabilitiesChange ? (
          // A liability going UP is bad news even though the number is
          // positive — invert positive/negative framing relative to the
          // other two tiles instead of always coloring a rise green.
          <StatDelta {...formatStatDelta(totalLiabilitiesChange)} positive={totalLiabilitiesChange.absoluteChange <= 0} />
        ) : (
          <StatCaption caption={caption} />
        )}
      </StatCard>

      <StatCard label="Net Worth Goal" value="—" icon={Target}>
        <StatCaption caption="No goal set yet" />
      </StatCard>
    </section>
  );
}
