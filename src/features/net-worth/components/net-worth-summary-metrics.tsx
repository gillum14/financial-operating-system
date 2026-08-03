import { CreditCard, Target, TrendingUp, Wallet } from "lucide-react";

import StatCard, { StatCaption } from "@/components/ui/stat-card";

import { formatCurrency } from "../format";

// Net Worth / Total Assets / Total Liabilities are REAL — computed from
// the owner's active Accounts (see net-worth-query.ts) — unlike every
// other placeholder page in this app, this one has genuine data to show
// once accounts exist. No "vs prior 30 days" delta on any of them: that
// requires a historical net-worth snapshot this app doesn't store.
//
// TECH DEBT: Net Worth Goal has no domain — no user-set target amount,
// no link to Goals (which itself has no Goals domain yet either). Honest
// placeholder, not the approved mockup's "$1,000,000.00 / 49% of goal".
export function NetWorthSummaryMetrics({
  netWorth,
  totalAssets,
  totalLiabilities,
  hasAccounts,
}: {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  hasAccounts: boolean;
}) {
  const caption = hasAccounts ? "Current balance" : "No accounts yet";

  return (
    <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Net Worth" value={hasAccounts ? formatCurrency(netWorth) : "—"} icon={TrendingUp}>
        <StatCaption caption={caption} />
      </StatCard>

      <StatCard label="Total Assets" value={hasAccounts ? formatCurrency(totalAssets) : "—"} icon={Wallet}>
        <StatCaption caption={caption} />
      </StatCard>

      <StatCard label="Total Liabilities" value={hasAccounts ? formatCurrency(totalLiabilities) : "—"} icon={CreditCard}>
        <StatCaption caption={caption} />
      </StatCard>

      <StatCard label="Net Worth Goal" value="—" icon={Target}>
        <StatCaption caption="No goal set yet" />
      </StatCard>
    </section>
  );
}
