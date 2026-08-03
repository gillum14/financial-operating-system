// Same currency formatting convention as the Accounts workspace
// (src/features/accounts/format.ts) — one formatter, not a second one
// invented for this feature.
const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount);
}

export function formatSignedAmount(amount: number): string {
  const formatted = currencyFormatter.format(Math.abs(amount));
  return amount < 0 ? `-${formatted}` : `+${formatted}`;
}

// transactionDate is a plain YYYY-MM-DD date string (no time, no
// timezone) — parsed as UTC midnight so the displayed day never shifts
// based on the viewer's local timezone.
export function formatTransactionDate(dateString: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${dateString}T00:00:00Z`),
  );
}
