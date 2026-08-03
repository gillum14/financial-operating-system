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
