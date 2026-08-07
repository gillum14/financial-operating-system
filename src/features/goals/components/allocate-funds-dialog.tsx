"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import type { AllocatableAccountOption } from "@/application/goals/goals-views";
import Dialog from "@/components/ui/dialog";
import { allocateGoalFunds } from "@/features/goals/actions";
import { useServerAction } from "@/lib/actions/use-action";

function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function AllocateFundsDialog({
  open,
  onClose,
  goalId,
  goalTitle,
  accountOptions,
}: {
  open: boolean;
  onClose: () => void;
  goalId: string;
  goalTitle: string;
  // Already includes every eligible-type, active account with a known
  // balance and its current unallocated balance (see
  // getGoalsOverview/ELIGIBLE_ALLOCATION_ACCOUNT_TYPES) — accounts already
  // allocated to this specific goal are still offered here (editing an
  // existing allocation from this same account happens via
  // AllocationRowControls, not by re-submitting this form, so a duplicate
  // submission surfaces GoalService's own "already allocated" ConflictError
  // rather than being silently hidden).
  accountOptions: AllocatableAccountOption[];
}) {
  const [accountId, setAccountId] = useState(accountOptions[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const router = useRouter();

  const allocate = useServerAction(allocateGoalFunds);
  const selectedAccount = accountOptions.find((option) => option.id === accountId);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedAmount = Number(amount);
    if (!accountId || !Number.isFinite(parsedAmount) || parsedAmount <= 0) return;

    allocate.run({ goalId, accountId, amount: parsedAmount }, () => {
      setAmount("");
      onClose();
      router.refresh();
    });
  }

  const noEligibleAccounts = accountOptions.length === 0;

  return (
    <Dialog open={open} onClose={onClose} title={`Allocate Funds — ${goalTitle}`}>
      {noEligibleAccounts ? (
        <p className="text-sm text-[var(--foreground-secondary)]">
          No eligible funding accounts with a known balance are available. Savings, checking, cash, investment,
          retirement, and CD/other-asset accounts can fund a goal once they have a balance set.
        </p>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="allocation-account" className="mb-1.5 block text-sm font-medium text-[var(--foreground-secondary)]">
              Funding account
            </label>
            <select
              id="allocation-account"
              required
              value={accountId}
              onChange={(event) => setAccountId(event.target.value)}
              className="w-full rounded-[calc(var(--radius)-8px)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
            >
              {accountOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name} — {formatCurrency(option.unallocatedBalance)} available
                </option>
              ))}
            </select>
            {selectedAccount && (
              <p className="mt-1 text-xs text-[var(--foreground-muted)]">
                {formatCurrency(selectedAccount.unallocatedBalance)} unallocated
                {selectedAccount.maturityDateLabel ? ` · Matures ${selectedAccount.maturityDateLabel}` : ""}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="allocation-amount" className="mb-1.5 block text-sm font-medium text-[var(--foreground-secondary)]">
              Amount to allocate
            </label>
            <input
              id="allocation-amount"
              type="number"
              inputMode="decimal"
              required
              min={0.01}
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0.00"
              className="w-full rounded-[calc(var(--radius)-8px)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
            />
            <p className="mt-1 text-xs text-[var(--foreground-muted)]">
              Money stays in this account — allocating only tags it for this goal (ADR-0003). The same account can
              fund multiple goals, and part of its balance can stay unallocated.
            </p>
          </div>

          {allocate.error && (
            <div role="alert" className="rounded-[calc(var(--radius)-8px)] bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
              <p>{allocate.error.message}</p>
              {allocate.error.fieldErrors && (
                <ul className="mt-1 list-inside list-disc">
                  {Object.entries(allocate.error.fieldErrors).map(([field, messages]) => (
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
              disabled={allocate.isPending}
              className="rounded-[calc(var(--radius)-8px)] bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
            >
              {allocate.isPending ? "Allocating…" : "Allocate Funds"}
            </button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
