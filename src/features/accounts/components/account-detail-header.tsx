import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import type { AccountDisplayGroup } from "@/application/dashboard/account-presentation";
import type { Account } from "@/domains/accounts/types";

import { formatBalance, formatMaskedAccountNumber, formatRelativeTime } from "../format";
import { AccountIcon } from "./account-icon";
import { AccountDetailHeaderMenu } from "./account-detail-header-menu";
import { AccountStatusBadge } from "./account-status-badge";

export function AccountDetailHeader({
  account,
  institutionName,
  displayGroup,
  displayLabel,
}: {
  account: Account;
  institutionName: string | null;
  displayGroup: AccountDisplayGroup;
  displayLabel: string;
}) {
  return (
    <div className="space-y-4">
      <Link
        href="/accounts"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--foreground-secondary)] transition-colors hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
        Back to Accounts
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--surface-hover)] text-[var(--foreground-secondary)]">
            <AccountIcon group={displayGroup} className="h-5 w-5" />
          </span>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">{account.name}</h1>
            <p className="mt-0.5 text-sm text-[var(--foreground-muted)]">
              {institutionName ?? "No institution"} · {displayLabel}
              {account.maskedAccountNumber && ` · ${formatMaskedAccountNumber(account.maskedAccountNumber)}`}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 sm:flex-col sm:items-end">
          <div className="text-right">
            <p className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
              {formatBalance(account.currentBalance ? Number(account.currentBalance) : null)}
            </p>
            <p className="mt-0.5 text-xs text-[var(--foreground-muted)]">
              Updated {formatRelativeTime(account.updatedAt)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <AccountStatusBadge status={account.status} balanceSource={account.balanceSource} />
            <AccountDetailHeaderMenu accountId={account.id} accountStatus={account.status} />
          </div>
        </div>
      </div>
    </div>
  );
}
