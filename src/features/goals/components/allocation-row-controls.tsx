"use client";

import { useRouter } from "next/navigation";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { useState } from "react";

import { removeGoalAllocation, updateGoalAllocation } from "@/features/goals/actions";
import { useServerAction } from "@/lib/actions/use-action";

// Small edit/remove island for one funding-source row — mirrors
// AllocationRowControls' Budgets namesake and ContributionRowControls
// exactly (server row, client island).
export function AllocationRowControls({
  allocationId,
  amount,
  accountName,
}: {
  allocationId: string;
  amount: number;
  accountName: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(String(amount));
  const router = useRouter();

  const update = useServerAction(updateGoalAllocation);
  const remove = useServerAction(removeGoalAllocation);

  function handleSave() {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    update.run({ allocationId, amount: parsed }, () => {
      setIsEditing(false);
      router.refresh();
    });
  }

  function handleRemove() {
    if (!window.confirm(`Remove the allocation from ${accountName}? The money stays in the account either way.`)) return;
    remove.run({ allocationId }, () => router.refresh());
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          inputMode="decimal"
          min={0.01}
          step="0.01"
          autoFocus
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="w-20 rounded-[calc(var(--radius)-10px)] border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-right text-xs text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
        />
        {update.error && <span className="text-xs text-[var(--danger)]">{update.error.message}</span>}
        <button
          type="button"
          onClick={handleSave}
          disabled={update.isPending}
          aria-label="Save"
          className="flex h-5 w-5 items-center justify-center rounded-full text-[var(--success)] hover:bg-[var(--surface-hover)] disabled:opacity-60"
        >
          <Check className="h-3 w-3" strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={() => {
            setValue(String(amount));
            setIsEditing(false);
          }}
          aria-label="Cancel"
          className="flex h-5 w-5 items-center justify-center rounded-full text-[var(--foreground-muted)] hover:bg-[var(--surface-hover)]"
        >
          <X className="h-3 w-3" strokeWidth={2} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        aria-label={`Edit allocation from ${accountName}`}
        className="flex h-5 w-5 items-center justify-center rounded-full text-[var(--foreground-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
      >
        <Pencil className="h-3 w-3" strokeWidth={1.75} />
      </button>
      <button
        type="button"
        onClick={handleRemove}
        disabled={remove.isPending}
        aria-label={`Remove allocation from ${accountName}`}
        className="flex h-5 w-5 items-center justify-center rounded-full text-[var(--foreground-muted)] hover:bg-[var(--danger)]/10 hover:text-[var(--danger)] disabled:opacity-60"
      >
        <Trash2 className="h-3 w-3" strokeWidth={1.75} />
      </button>
    </div>
  );
}
