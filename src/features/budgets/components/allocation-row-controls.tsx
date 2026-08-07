"use client";

import { useRouter } from "next/navigation";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { useState } from "react";

import { removeBudgetAllocation, updateBudgetAllocation } from "@/features/budgets/actions";
import { useServerAction } from "@/lib/actions/use-action";

// Small edit/remove island embedded in an otherwise server-rendered
// category row (BudgetByCategoryCard) — only this control needs
// client-side interactivity, so the row's data/layout stays a plain
// Server Component and only this piece is a "use client" boundary.
export function AllocationRowControls({
  allocationId,
  plannedAmount,
  categoryName,
}: {
  allocationId: string;
  plannedAmount: number;
  categoryName: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [amount, setAmount] = useState(String(plannedAmount));
  const router = useRouter();

  const update = useServerAction(updateBudgetAllocation);
  const remove = useServerAction(removeBudgetAllocation);

  function handleSave() {
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed < 0) return;
    update.run({ budgetAllocationId: allocationId, plannedAmount: parsed }, () => {
      setIsEditing(false);
      router.refresh();
    });
  }

  function handleRemove() {
    if (!window.confirm(`Remove ${categoryName} from this budget?`)) return;
    remove.run({ budgetAllocationId: allocationId }, () => router.refresh());
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          autoFocus
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          className="w-24 rounded-[calc(var(--radius)-10px)] border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-right text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={update.isPending}
          aria-label="Save"
          className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--success)] hover:bg-[var(--surface-hover)] disabled:opacity-60"
        >
          <Check className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={() => {
            setAmount(String(plannedAmount));
            setIsEditing(false);
          }}
          aria-label="Cancel"
          className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--foreground-muted)] hover:bg-[var(--surface-hover)]"
        >
          <X className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        aria-label={`Edit ${categoryName} allocation`}
        className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--foreground-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
      >
        <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
      </button>
      <button
        type="button"
        onClick={handleRemove}
        disabled={remove.isPending}
        aria-label={`Remove ${categoryName} from budget`}
        className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--foreground-muted)] hover:bg-[var(--danger)]/10 hover:text-[var(--danger)] disabled:opacity-60"
      >
        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
      </button>
    </div>
  );
}
