import Badge from "@/components/ui/badge";
import type { AccountBalanceSource, AccountStatus } from "@/domains/accounts/types";

// Honest mapping, not a live-connection claim: `balanceSource` only
// distinguishes "this balance is provider-computed" (computed) from
// "the owner enters it" (manual) — there is no data_provider_connections
// link on accounts yet, so this badge cannot and does not represent real
// connection health, sync recency, or provider identity. See
// AccountHealthCard / AccountInformationCard for where that gap is called
// out explicitly with a technical-debt note.
export function AccountStatusBadge({
  status,
  balanceSource,
}: {
  status: AccountStatus;
  balanceSource: AccountBalanceSource;
}) {
  if (status === "archived") {
    return <Badge tone="neutral">Archived</Badge>;
  }
  return balanceSource === "computed" ? <Badge tone="success">Connected</Badge> : <Badge tone="neutral">Manual</Badge>;
}
