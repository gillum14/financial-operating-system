"use client";

import { useState } from "react";

import Card from "@/components/ui/card";
import CardHeader from "@/components/ui/card-header";
import { getAccountPresentation } from "@/application/dashboard/account-presentation";
import { ACCOUNT_TYPES } from "@/domains/accounts/types";
import type { Account } from "@/domains/accounts/types";
import type { InstitutionOption } from "@/application/accounts/accounts-views";
import { updateAccount } from "@/features/accounts/actions";
import { useServerAction } from "@/lib/actions/use-action";

const ACCOUNT_TYPE_OPTIONS = ACCOUNT_TYPES.map((value) => ({
  value,
  label: getAccountPresentation(value).label,
}));

export function EditAccountForm({ account, institutions }: { account: Account; institutions: InstitutionOption[] }) {
  const update = useServerAction(updateAccount);
  const [saved, setSaved] = useState(false);

  return (
    <Card>
      <CardHeader title="Account details" subtitle="Update the information for this account." />

      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          setSaved(false);
          const formData = new FormData(event.currentTarget);
          const institutionId = formData.get("institutionId");
          const currentBalance = formData.get("currentBalance");
          const maskedAccountNumber = formData.get("maskedAccountNumber");

          update.run(
            {
              accountId: account.id,
              name: formData.get("name"),
              accountType: formData.get("accountType"),
              institutionId: institutionId ? institutionId : undefined,
              currentBalance: currentBalance ? currentBalance : undefined,
              maskedAccountNumber: maskedAccountNumber ? maskedAccountNumber : undefined,
            },
            () => setSaved(true),
          );
        }}
      >
        <div>
          <label htmlFor="edit-name" className="mb-1.5 block text-sm font-medium text-[var(--foreground-secondary)]">
            Account name
          </label>
          <input
            id="edit-name"
            name="name"
            type="text"
            required
            maxLength={200}
            defaultValue={account.name}
            className="w-full rounded-[calc(var(--radius)-8px)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="edit-type" className="mb-1.5 block text-sm font-medium text-[var(--foreground-secondary)]">
            Account type
          </label>
          <select
            id="edit-type"
            name="accountType"
            required
            defaultValue={account.accountType}
            className="w-full rounded-[calc(var(--radius)-8px)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
          >
            {ACCOUNT_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="edit-institution" className="mb-1.5 block text-sm font-medium text-[var(--foreground-secondary)]">
            Institution
          </label>
          <select
            id="edit-institution"
            name="institutionId"
            defaultValue={account.institutionId ?? ""}
            className="w-full rounded-[calc(var(--radius)-8px)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
          >
            <option value="">No institution</option>
            {institutions.map((institution) => (
              <option key={institution.id} value={institution.id}>
                {institution.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="edit-masked-number"
            className="mb-1.5 block text-sm font-medium text-[var(--foreground-secondary)]"
          >
            Account number (last 4 digits)
          </label>
          <input
            id="edit-masked-number"
            name="maskedAccountNumber"
            type="text"
            maxLength={50}
            defaultValue={account.maskedAccountNumber ?? ""}
            placeholder="•••• 1234"
            className="w-full rounded-[calc(var(--radius)-8px)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="edit-balance" className="mb-1.5 block text-sm font-medium text-[var(--foreground-secondary)]">
            Current balance
          </label>
          <input
            id="edit-balance"
            name="currentBalance"
            type="text"
            inputMode="decimal"
            defaultValue={account.currentBalance ? Number(account.currentBalance).toFixed(2) : ""}
            className="w-full rounded-[calc(var(--radius)-8px)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
          />
        </div>

        {update.error && (
          <div role="alert" className="rounded-[calc(var(--radius)-8px)] bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
            <p>{update.error.message}</p>
            {update.error.fieldErrors && (
              <ul className="mt-1 list-inside list-disc">
                {Object.entries(update.error.fieldErrors).map(([field, messages]) => (
                  <li key={field}>{messages.join(" ")}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {saved && !update.error && !update.isPending && (
          <p role="status" className="rounded-[calc(var(--radius)-8px)] bg-[var(--success)]/10 px-3 py-2 text-sm text-[var(--success)]">
            Changes saved.
          </p>
        )}

        <button
          type="submit"
          disabled={update.isPending}
          className="rounded-[calc(var(--radius)-8px)] bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
        >
          {update.isPending ? "Saving…" : "Save changes"}
        </button>
      </form>
    </Card>
  );
}
