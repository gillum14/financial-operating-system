"use client";

import { useRouter } from "next/navigation";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { useState } from "react";

import { removeGoalContribution, updateGoalContribution } from "@/features/goals/actions";
import { useServerAction } from "@/lib/actions/use-action";

// Small edit/remove island for one contribution row — mirrors
// AllocationRowControls' "server row, client island" split exactly. Lives
// in the Recent Contributions rail since Goals V1 has no separate
// Contributions tab/page yet (see goals-tabs.tsx's disabled tabs).
export function ContributionRowControls({
  contributionId,
  amount,
  goalTitle,
}: {
  contributionId: string;
  amount: number;
  goalTitle: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(String(amount));
  const router = useRouter();

  const update = useServerAction(updateGoalContribution);
  const remove = useServerAction(removeGoalContribution);

  function handleSave() {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    update.run({ contributionId, amount: parsed }, () => {
      setIsEditing(false);
      router.refresh();
    });
  }

  function handleRemove() {
    if (!window.confirm(`Remove this contribution to ${goalTitle}?`)) return;
    remove.run({ contributionId }, () => router.refresh());
  }

  if (isEditing) {
    return (
      <div className="mt-1 flex items-center gap-1.5">
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
    <div className="mt-1 flex items-center gap-1">
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        aria-label={`Edit contribution to ${goalTitle}`}
        className="flex h-5 w-5 items-center justify-center rounded-full text-[var(--foreground-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
      >
        <Pencil className="h-3 w-3" strokeWidth={1.75} />
      </button>
      <button
        type="button"
        onClick={handleRemove}
        disabled={remove.isPending}
        aria-label={`Remove contribution to ${goalTitle}`}
        className="flex h-5 w-5 items-center justify-center rounded-full text-[var(--foreground-muted)] hover:bg-[var(--danger)]/10 hover:text-[var(--danger)] disabled:opacity-60"
      >
        <Trash2 className="h-3 w-3" strokeWidth={1.75} />
      </button>
    </div>
  );
}
