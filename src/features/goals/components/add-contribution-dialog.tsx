"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import Dialog from "@/components/ui/dialog";
import { addGoalContribution } from "@/features/goals/actions";
import { useServerAction } from "@/lib/actions/use-action";

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function AddContributionDialog({
  open,
  onClose,
  goalId,
  goalTitle,
}: {
  open: boolean;
  onClose: () => void;
  goalId: string;
  goalTitle: string;
}) {
  const [amount, setAmount] = useState("");
  const [contributionDate, setContributionDate] = useState(todayDateString());
  const [note, setNote] = useState("");
  const router = useRouter();

  const addContribution = useServerAction(addGoalContribution);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return;

    addContribution.run({ goalId, amount: parsedAmount, contributionDate, note: note.trim() || undefined }, () => {
      setAmount("");
      setNote("");
      setContributionDate(todayDateString());
      onClose();
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onClose={onClose} title={`Add Contribution — ${goalTitle}`}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="contribution-amount" className="mb-1.5 block text-sm font-medium text-[var(--foreground-secondary)]">
              Amount
            </label>
            <input
              id="contribution-amount"
              type="number"
              inputMode="decimal"
              required
              min={0.01}
              step="0.01"
              autoFocus
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0.00"
              className="w-full rounded-[calc(var(--radius)-8px)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="contribution-date" className="mb-1.5 block text-sm font-medium text-[var(--foreground-secondary)]">
              Date
            </label>
            <input
              id="contribution-date"
              type="date"
              required
              value={contributionDate}
              onChange={(event) => setContributionDate(event.target.value)}
              className="w-full rounded-[calc(var(--radius)-8px)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label htmlFor="contribution-note" className="mb-1.5 block text-sm font-medium text-[var(--foreground-secondary)]">
            Note <span className="text-[var(--foreground-muted)]">(optional)</span>
          </label>
          <input
            id="contribution-note"
            type="text"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Birthday money, tax refund, etc."
            className="w-full rounded-[calc(var(--radius)-8px)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
          />
        </div>

        {addContribution.error && (
          <div role="alert" className="rounded-[calc(var(--radius)-8px)] bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
            <p>{addContribution.error.message}</p>
            {addContribution.error.fieldErrors && (
              <ul className="mt-1 list-inside list-disc">
                {Object.entries(addContribution.error.fieldErrors).map(([field, messages]) => (
                  <li key={field}>{messages.join(" ")}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[calc(var(--radius)-8px)] border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground-secondary)] hover:bg-[var(--surface-hover)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={addContribution.isPending}
            className="rounded-[calc(var(--radius)-8px)] bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
          >
            {addContribution.isPending ? "Adding…" : "Add Contribution"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
