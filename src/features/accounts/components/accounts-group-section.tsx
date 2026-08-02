"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

import type { AccountDisplayGroup } from "@/application/dashboard/account-presentation";
import type { AccountListRow } from "@/application/accounts/accounts-views";

import { formatBalance, formatMaskedAccountNumber, formatRelativeTime } from "../format";
import { AccountIcon } from "./account-icon";
import { AccountRowMenu } from "./account-row-menu";
import { AccountStatusBadge } from "./account-status-badge";

function groupTotal(rows: AccountListRow[]): number {
  return rows.reduce((sum, row) => sum + (row.account.currentBalance ? Number(row.account.currentBalance) : 0), 0);
}

export function AccountsGroupSection({ group, rows }: { group: AccountDisplayGroup; rows: AccountListRow[] }) {
  const [expanded, setExpanded] = useState(true);
  const total = groupTotal(rows);

  return (
    <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)]">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition-colors hover:bg-[var(--surface-hover)]"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[calc(var(--radius)-8px)] bg-[var(--surface-hover)] text-[var(--foreground-secondary)]">
            <AccountIcon group={group} />
          </span>
          <span className="text-base font-semibold text-[var(--foreground)]">{group}</span>
        </span>

        <span className="flex items-center gap-4">
          <span className="text-base font-semibold text-[var(--foreground)]">{formatBalance(total)}</span>
          <span className="text-sm text-[var(--foreground-muted)]">
            {rows.length} account{rows.length === 1 ? "" : "s"}
          </span>
          <ChevronDown
            className={`h-4 w-4 text-[var(--foreground-muted)] transition-transform ${expanded ? "rotate-180" : ""}`}
            strokeWidth={1.75}
          />
        </span>
      </button>

      {expanded && (
        <div className="overflow-x-auto border-t border-[var(--border)]">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs font-semibold tracking-[0.06em] text-[var(--foreground-muted)] uppercase">
                <th className="px-6 py-3 font-semibold">Account</th>
                <th className="px-4 py-3 font-semibold">Institution</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 text-right font-semibold">Balance</th>
                <th className="px-4 py-3 font-semibold">Last updated</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3" aria-hidden="true" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.account.id}
                  className="border-b border-[var(--border-subtle)] last:border-b-0 hover:bg-[var(--surface-hover)]"
                >
                  <td className="px-6 py-3">
                    <Link href={`/accounts/${row.account.id}`} className="block outline-none focus-visible:underline">
                      <span className="block font-medium text-[var(--foreground)]">{row.account.name}</span>
                      <span className="block text-xs text-[var(--foreground-muted)]">
                        {formatMaskedAccountNumber(row.account.maskedAccountNumber)}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[var(--foreground-secondary)]">
                    {row.institutionName ?? "No institution"}
                  </td>
                  <td className="px-4 py-3 text-[var(--foreground-secondary)]">{row.displayLabel}</td>
                  <td className="px-4 py-3 text-right font-medium text-[var(--foreground)]">
                    {formatBalance(row.account.currentBalance ? Number(row.account.currentBalance) : null)}
                  </td>
                  <td className="px-4 py-3 text-[var(--foreground-secondary)]">
                    {formatRelativeTime(row.account.updatedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <AccountStatusBadge status={row.account.status} balanceSource={row.account.balanceSource} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <AccountRowMenu accountId={row.account.id} accountName={row.account.name} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
