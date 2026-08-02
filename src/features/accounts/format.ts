const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatBalance(balance: number | null): string {
  if (balance === null) return "—";
  return currencyFormatter.format(balance);
}

// "Last updated" reflects the account row's real updatedAt timestamp —
// honest for any account, manual or provider-fed. Not to be confused with
// a provider "last synchronized" claim, which this codebase has no data
// for (see AccountInformationCard).
export function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.round(diffMs / 60_000);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} min${diffMinutes === 1 ? "" : "s"} ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hr${diffHours === 1 ? "" : "s"} ago`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

export function formatMaskedAccountNumber(masked: string | null): string {
  if (!masked) return "—";
  return masked.startsWith("••••") || masked.startsWith("....") ? masked : `•••• ${masked.slice(-4)}`;
}
