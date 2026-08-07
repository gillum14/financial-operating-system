"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import Dialog from "@/components/ui/dialog";
import { activateBudgetPeriod, createBudgetPeriod } from "@/features/budgets/actions";
import { useServerAction } from "@/lib/actions/use-action";

function currentMonthRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
  const end = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0));
  const iso = (date: Date) => date.toISOString().slice(0, 10);
  return { start: iso(start), end: iso(end) };
}

export function CreateBudgetDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const defaults = currentMonthRange();
  const [periodStart, setPeriodStart] = useState(defaults.start);
  const [periodEnd, setPeriodEnd] = useState(defaults.end);
  const router = useRouter();

  const create = useServerAction(createBudgetPeriod);
  const activate = useServerAction(activateBudgetPeriod);
  const isPending = create.isPending || activate.isPending;
  const error = create.error ?? activate.error;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    create.run({ periodStart, periodEnd }, (period) => {
      // A new budget period starts in Draft — creating one from this
      // dialog immediately activates it too, since "Create Budget" is a
      // single user-facing action for what's meant to become their
      // current budget, not a two-step draft-then-activate flow. The
      // Draft status still exists and is meaningfully reachable (a period
      // whose activation fails here, or one left alone deliberately,
      // stays in Draft) — this dialog just chains both calls for the
      // common case.
      activate.run({ budgetPeriodId: period.id }, () => {
        onClose();
        router.refresh();
      });
    });
  }

  return (
    <Dialog open={open} onClose={onClose} title="Create Budget">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <p className="text-sm text-[var(--foreground-secondary)]">
          Choose the calendar month this budget covers. You can allocate categories once it&apos;s created.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="budget-period-start" className="mb-1.5 block text-sm font-medium text-[var(--foreground-secondary)]">
              Start date
            </label>
            <input
              id="budget-period-start"
              type="date"
              required
              value={periodStart}
              onChange={(event) => setPeriodStart(event.target.value)}
              className="w-full rounded-[calc(var(--radius)-8px)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="budget-period-end" className="mb-1.5 block text-sm font-medium text-[var(--foreground-secondary)]">
              End date
            </label>
            <input
              id="budget-period-end"
              type="date"
              required
              value={periodEnd}
              onChange={(event) => setPeriodEnd(event.target.value)}
              className="w-full rounded-[calc(var(--radius)-8px)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
            />
          </div>
        </div>

        {error && (
          <div role="alert" className="rounded-[calc(var(--radius)-8px)] bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
            <p>{error.message}</p>
            {error.fieldErrors && (
              <ul className="mt-1 list-inside list-disc">
                {Object.entries(error.fieldErrors).map(([field, messages]) => (
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
            disabled={isPending}
            className="rounded-[calc(var(--radius)-8px)] bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Creating…" : "Create Budget"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
