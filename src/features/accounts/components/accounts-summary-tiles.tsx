import { AlertTriangle, ArrowDownRight, ArrowUpRight, TrendingUp } from "lucide-react";

import StatCard, { StatCaption } from "@/components/ui/stat-card";
import type { AccountsSummary } from "@/application/accounts/accounts-summary";

import { formatBalance } from "../format";

// "— No change" (not a fabricated delta): there's no historical balance
// snapshot to compare against, matching the same honesty rule the
// dashboard's own DashboardStatSnapshot already follows (see
// src/application/dashboard/types.ts).
const NO_CHANGE_CAPTION = "No change";

export function AccountsSummaryTiles({ summary }: { summary: AccountsSummary }) {
  return (
    <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
      <StatCard label="You Have" value={formatBalance(summary.youHave)} icon={ArrowUpRight}>
        <StatCaption caption={NO_CHANGE_CAPTION} />
      </StatCard>

      <StatCard label="You Owe" value={formatBalance(summary.youOwe)} icon={ArrowDownRight}>
        <StatCaption caption={NO_CHANGE_CAPTION} />
      </StatCard>

      <StatCard label="Difference" value={formatBalance(summary.difference)} icon={TrendingUp}>
        <StatCaption caption={NO_CHANGE_CAPTION} />
      </StatCard>

      {/* TECH DEBT: "Needs attention" has no backing concept anywhere in
          the schema (no connection-health, review-required, or
          reconnect-by field on accounts). Rendered as an honest disabled
          tile per the approved deviation policy, rather than a fabricated
          count — see Known Deviations in the delivery report. */}
      <StatCard label="Needs Attention" value="—" icon={AlertTriangle}>
        <StatCaption caption="Not tracked yet" />
      </StatCard>
    </section>
  );
}
