import type { ReactNode } from "react";

import Card from "@/components/ui/card";
import CardHeader from "@/components/ui/card-header";
import type { Account } from "@/domains/accounts/types";

import { formatMaskedAccountNumber, formatRelativeTime } from "../format";

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--border-subtle)] py-2.5 last:border-b-0">
      <span className="text-sm text-[var(--foreground-muted)]">{label}</span>
      <span className="text-sm font-medium text-[var(--foreground)]">{value}</span>
    </div>
  );
}

// A visually inert switch — represents the mockup's toggle control without
// implying it does anything, since there is nothing behind it to toggle
// (see the "Included in..." rows below).
function DisabledToggle({ on }: { on: boolean }) {
  return (
    <span
      role="switch"
      aria-checked={on}
      aria-disabled="true"
      title="Not yet configurable"
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-not-allowed items-center rounded-full opacity-70 ${
        on ? "bg-[var(--primary)]/40" : "bg-[var(--surface-hover)]"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
          on ? "translate-x-4" : "translate-x-1"
        }`}
      />
    </span>
  );
}

export function AccountInformationCard({
  account,
  institutionName,
  displayLabel,
}: {
  account: Account;
  institutionName: string | null;
  displayLabel: string;
}) {
  return (
    <Card>
      <CardHeader title="Account information" />

      <div>
        <InfoRow label="Account type" value={displayLabel} />
        <InfoRow label="Institution" value={institutionName ?? "None"} />

        {/* TECH DEBT: per-account net-worth/cash-flow inclusion isn't
            modeled — every account is unconditionally included in both
            calculations today (see DashboardService.getDashboardData).
            These reflect that real, current behavior as a fixed state
            rather than an editable one, instead of fabricating a working
            control. */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] py-2.5">
          <span className="text-sm text-[var(--foreground-muted)]">Included in net position</span>
          <DisabledToggle on />
        </div>
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] py-2.5">
          <span className="text-sm text-[var(--foreground-muted)]">Included in cash flow</span>
          <DisabledToggle on />
        </div>

        {/* TECH DEBT: no sync-timestamp field exists; account.updatedAt
            reflects any row edit, not a confirmed provider sync, so it is
            not substituted here. */}
        <InfoRow label="Last synchronized" value="Not available" />
        <InfoRow label="Data source" value={account.balanceSource === "computed" ? "Connected" : "Manual entry"} />
        <InfoRow label="Account number" value={formatMaskedAccountNumber(account.maskedAccountNumber)} />
        <InfoRow label="Last updated" value={formatRelativeTime(account.updatedAt)} />
      </div>
    </Card>
  );
}
