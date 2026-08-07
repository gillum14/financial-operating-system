import { Wallet } from "lucide-react";

import { getAccountsPageData } from "@/composition/accounts-query";
import { requireAuthenticatedUser } from "@/lib/auth/authenticated-user";
import { AccountsGroupSection } from "@/features/accounts/components/accounts-group-section";
import { AccountsSummaryTiles } from "@/features/accounts/components/accounts-summary-tiles";
import { AddAccountControl } from "@/features/accounts/components/add-account-control";

// Live, per-owner data resolved at request time — must never be statically
// prerendered or cached across owners (same rule as the dashboard page).
export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const authUser = await requireAuthenticatedUser();
  // Single call, single flat query batch inside it — see the comment on
  // getAccountsPageData for why this must not be two separate composed
  // functions combined via an outer Promise.all here.
  const { listView, institutions } = await getAccountsPageData(authUser.id);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">Accounts</h1>
          <p className="mt-1 text-sm text-[var(--foreground-muted)]">A complete view of what you own, owe, and manage.</p>
        </div>

        <AddAccountControl institutions={institutions} />
      </section>

      <AccountsSummaryTiles summary={listView.summary} />

      {listView.rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[var(--radius)] border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-hover)] text-[var(--foreground-secondary)]">
            <Wallet className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <p className="mt-4 text-base font-semibold text-[var(--foreground)]">No accounts yet</p>
          <p className="mt-1 max-w-sm text-sm text-[var(--foreground-muted)]">
            Add your first account to start tracking what you have and what you owe.
          </p>
          <div className="mt-4">
            <AddAccountControl institutions={institutions} />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {listView.groupOrder
            .filter((group) => (listView.groups[group]?.length ?? 0) > 0)
            .map((group) => <AccountsGroupSection key={group} group={group} rows={listView.groups[group]!} />)}
        </div>
      )}
    </div>
  );
}
