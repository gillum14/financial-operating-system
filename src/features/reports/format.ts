// Same currency formatting convention as Accounts/Transactions
// (src/features/accounts/format.ts, src/features/transactions/format.ts)
// — one formatter shape, not a third divergent one for this feature.
const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount);
}
