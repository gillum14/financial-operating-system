"use client";

import Card from "@/components/ui/card";
import CardHeader from "@/components/ui/card-header";
import type { AccountStatus } from "@/domains/accounts/types";
import { archiveAccount, restoreAccount } from "@/features/accounts/actions";
import { useServerAction } from "@/lib/actions/use-action";

export function AccountLifecycleCard({ accountId, status }: { accountId: string; status: AccountStatus }) {
  const archive = useServerAction(archiveAccount);
  const restore = useServerAction(restoreAccount);
  const isPending = archive.isPending || restore.isPending;
  const error = archive.error ?? restore.error;

  return (
    <Card>
      <CardHeader
        title="Archive"
        subtitle={
          status === "active"
            ? "Archiving hides this account from the Accounts list without deleting it. Historical transactions stay intact, and you can restore it anytime."
            : "This account is archived. Restore it to bring it back to the active Accounts list."
        }
      />

      {error && (
        <p role="alert" className="mb-3 rounded-[calc(var(--radius)-8px)] bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
          {error.message}
        </p>
      )}

      {status === "active" ? (
        <button
          type="button"
          disabled={isPending}
          onClick={() => archive.run({ accountId })}
          className="rounded-[calc(var(--radius)-8px)] border border-[var(--danger)]/40 px-4 py-2.5 text-sm font-medium text-[var(--danger)] transition-colors hover:bg-[var(--danger)]/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {archive.isPending ? "Archiving…" : "Archive account"}
        </button>
      ) : (
        <button
          type="button"
          disabled={isPending}
          onClick={() => restore.run({ accountId })}
          className="rounded-[calc(var(--radius)-8px)] bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
        >
          {restore.isPending ? "Restoring…" : "Restore account"}
        </button>
      )}
    </Card>
  );
}
