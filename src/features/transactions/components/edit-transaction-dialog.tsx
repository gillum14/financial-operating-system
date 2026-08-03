"use client";

import { useState } from "react";

import Dialog from "@/components/ui/dialog";
import type { TransactionFilterOption, TransactionListItem } from "@/application/transactions/transactions-views";
import { updateTransaction } from "@/features/transactions/actions";
import { useServerAction } from "@/lib/actions/use-action";

export function EditTransactionDialog({
  item,
  categoryOptions,
  onClose,
}: {
  item: TransactionListItem | null;
  categoryOptions: TransactionFilterOption[];
  onClose: () => void;
}) {
  return (
    <Dialog open={item !== null} onClose={onClose} title="Edit transaction">
      {item && (
        // Keyed by transaction id so switching to a different row remounts
        // the form (fresh useServerAction state) instead of showing a
        // stale error/pending state from a previously edited row.
        <EditTransactionForm key={item.transaction.id} item={item} categoryOptions={categoryOptions} onClose={onClose} />
      )}
    </Dialog>
  );
}

function EditTransactionForm({
  item,
  categoryOptions,
  onClose,
}: {
  item: TransactionListItem;
  categoryOptions: TransactionFilterOption[];
  onClose: () => void;
}) {
  const update = useServerAction(updateTransaction);
  const [isExcluded, setIsExcluded] = useState(item.transaction.isExcluded);

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const categoryId = formData.get("categoryId");
        const merchant = formData.get("merchant");
        const notes = formData.get("notes");

        update.run(
          {
            transactionId: item.transaction.id,
            categoryId: categoryId ? categoryId : null,
            merchant: merchant ? merchant : undefined,
            notes: notes ? notes : undefined,
            isExcluded,
          },
          onClose,
        );
      }}
    >
      <div>
        <p className="text-sm font-medium text-[var(--foreground)]">{item.transaction.originalDescription}</p>
        <p className="mt-0.5 text-xs text-[var(--foreground-muted)]">
          {item.accountName} · {item.transaction.transactionDate}
        </p>
      </div>

      <div>
        <label htmlFor="edit-txn-category" className="mb-1.5 block text-sm font-medium text-[var(--foreground-secondary)]">
          Category
        </label>
        <select
          id="edit-txn-category"
          name="categoryId"
          defaultValue={item.transaction.categoryId ?? ""}
          className="w-full rounded-[calc(var(--radius)-8px)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
        >
          <option value="">Uncategorized</option>
          {categoryOptions.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="edit-txn-merchant" className="mb-1.5 block text-sm font-medium text-[var(--foreground-secondary)]">
          Merchant
        </label>
        <input
          id="edit-txn-merchant"
          name="merchant"
          type="text"
          maxLength={200}
          defaultValue={item.transaction.merchant ?? ""}
          placeholder="Not set"
          className="w-full rounded-[calc(var(--radius)-8px)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="edit-txn-notes" className="mb-1.5 block text-sm font-medium text-[var(--foreground-secondary)]">
          Notes
        </label>
        <textarea
          id="edit-txn-notes"
          name="notes"
          rows={3}
          maxLength={2000}
          defaultValue={item.transaction.notes ?? ""}
          className="w-full rounded-[calc(var(--radius)-8px)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-[var(--foreground-secondary)]">
        <input
          type="checkbox"
          checked={isExcluded}
          onChange={(event) => setIsExcluded(event.target.checked)}
          className="h-4 w-4 rounded border-[var(--border)] accent-[var(--primary)]"
        />
        Exclude from income and expense totals
      </label>

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

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-[calc(var(--radius)-8px)] border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--foreground-secondary)] transition-colors hover:bg-[var(--surface-hover)]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={update.isPending}
          className="rounded-[calc(var(--radius)-8px)] bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
        >
          {update.isPending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
