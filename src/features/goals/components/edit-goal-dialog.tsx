"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import type { GoalRow } from "@/application/goals/goals-views";
import Dialog from "@/components/ui/dialog";
import type { GoalPriority, GoalType } from "@/domains/goals/types";
import { updateGoal } from "@/features/goals/actions";
import { useServerAction } from "@/lib/actions/use-action";
import { GOAL_PRIORITY_LABELS, GOAL_PRIORITY_OPTIONS, GOAL_TYPE_LABELS, GOAL_TYPE_OPTIONS } from "@/lib/goal-presentation";

// Account/category linking is set at creation time only in this V1 UI —
// CreateGoalDialog exposes both pickers; this form covers the fields a
// goal is actually likely to need editing (title, description, target
// amount, goal type). GoalService.updateGoal still accepts
// categoryId/accountId changes for a future edit-linking UI.
export function EditGoalDialog({
  open,
  onClose,
  goal,
}: {
  open: boolean;
  onClose: () => void;
  goal: GoalRow;
}) {
  const [title, setTitle] = useState(goal.title);
  const [description, setDescription] = useState(goal.description ?? "");
  const [targetAmount, setTargetAmount] = useState(String(goal.targetAmount));
  const [goalType, setGoalType] = useState<GoalType>(goal.goalType);
  const [priority, setPriority] = useState<GoalPriority>(goal.priority);

  const router = useRouter();
  const update = useServerAction(updateGoal);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(targetAmount);
    if (!title.trim() || !Number.isFinite(amount) || amount <= 0) return;

    update.run(
      {
        goalId: goal.id,
        title: title.trim(),
        description: description.trim() || undefined,
        targetAmount: amount,
        goalType,
        priority,
      },
      () => {
        onClose();
        router.refresh();
      },
    );
  }

  return (
    <Dialog open={open} onClose={onClose} title={`Edit Goal — ${goal.title}`}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="edit-goal-title" className="mb-1.5 block text-sm font-medium text-[var(--foreground-secondary)]">
            Title
          </label>
          <input
            id="edit-goal-title"
            type="text"
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-full rounded-[calc(var(--radius)-8px)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="edit-goal-description" className="mb-1.5 block text-sm font-medium text-[var(--foreground-secondary)]">
            Description <span className="text-[var(--foreground-muted)]">(optional)</span>
          </label>
          <input
            id="edit-goal-description"
            type="text"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="w-full rounded-[calc(var(--radius)-8px)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="edit-goal-target-amount" className="mb-1.5 block text-sm font-medium text-[var(--foreground-secondary)]">
              Target amount
            </label>
            <input
              id="edit-goal-target-amount"
              type="number"
              inputMode="decimal"
              required
              min={0.01}
              step="0.01"
              value={targetAmount}
              onChange={(event) => setTargetAmount(event.target.value)}
              className="w-full rounded-[calc(var(--radius)-8px)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="edit-goal-type" className="mb-1.5 block text-sm font-medium text-[var(--foreground-secondary)]">
              Goal type
            </label>
            <select
              id="edit-goal-type"
              value={goalType}
              onChange={(event) => setGoalType(event.target.value as GoalType)}
              className="w-full rounded-[calc(var(--radius)-8px)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
            >
              {GOAL_TYPE_OPTIONS.map((type) => (
                <option key={type} value={type}>
                  {GOAL_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="edit-goal-priority" className="mb-1.5 block text-sm font-medium text-[var(--foreground-secondary)]">
            Priority
          </label>
          <select
            id="edit-goal-priority"
            value={priority}
            onChange={(event) => setPriority(event.target.value as GoalPriority)}
            className="w-full rounded-[calc(var(--radius)-8px)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
          >
            {GOAL_PRIORITY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {GOAL_PRIORITY_LABELS[option]}
              </option>
            ))}
          </select>
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
            disabled={update.isPending}
            className="rounded-[calc(var(--radius)-8px)] bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
          >
            {update.isPending ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
