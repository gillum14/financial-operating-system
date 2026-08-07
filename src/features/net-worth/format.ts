import type { NetWorthChange } from "@/application/net-worth/net-worth-views";

// Same currency formatting convention as Accounts/Transactions/Reports
// (src/features/accounts/format.ts, etc.) — one formatter shape, not a
// divergent one for this feature.
const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount);
}

function formatComparisonDate(dateString: string): string {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// The one place a NetWorthChange (from net-worth-history-calculations.ts)
// is turned into StatDelta's {deltaLabel, positive, caption} props —
// Dashboard's Net Worth tile and this page's own summary metrics both
// import this rather than each formatting the same canonical change
// differently.
export function formatStatDelta(change: NetWorthChange): { deltaLabel: string; positive: boolean; caption: string } {
  const sign = change.absoluteChange >= 0 ? "+" : "-";
  const percentSuffix = change.percentChange !== null ? ` (${sign}${Math.abs(change.percentChange).toFixed(1)}%)` : "";
  return {
    deltaLabel: `${sign}${formatCurrency(Math.abs(change.absoluteChange))}${percentSuffix}`,
    positive: change.absoluteChange >= 0,
    caption: `vs ${formatComparisonDate(change.comparisonDate)}`,
  };
}
