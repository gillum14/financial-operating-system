"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import type { LinkableAccountOption, LinkableCategoryOption } from "@/application/goals/goals-views";
import Dialog from "@/components/ui/dialog";
import type { GoalPriority, GoalType } from "@/domains/goals/types";
import { createGoal } from "@/features/goals/actions";
import { useServerAction } from "@/lib/actions/use-action";
import {
  GOAL_COLOR_OPTIONS,
  GOAL_PRIORITY_LABELS,
  GOAL_PRIORITY_OPTIONS,
  GOAL_TYPE_LABELS,
  GOAL_TYPE_OPTIONS,
} from "@/lib/goal-presentation";

export function CreateGoalDialog({
  open,
  onClose,
  linkableAccounts,
  linkableCategories,
}: {
  open: boolean;
  onClose: () => void;
  linkableAccounts: LinkableAccountOption[];
  linkableCategories: LinkableCategoryOption[];
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [goalType, setGoalType] = useState<GoalType>("general-savings");
  const [priority, setPriority] = useState<GoalPriority>("medium");
  const [color, setColor] = useState<string>(GOAL_COLOR_OPTIONS[0]);
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const router = useRouter();

  const create = useServerAction(createGoal);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(targetAmount);
    if (!title.trim() || !Number.isFinite(amount) || amount <= 0) return;

    create.run(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        targetAmount: amount,
        targetDate: targetDate || undefined,
        goalType,
        priority,
        color,
        accountId: accountId || undefined,
        categoryId: categoryId || undefined,
      },
      () => {
        setTitle("");
        setDescription("");
        setTargetAmount("");
        setTargetDate("");
        setAccountId("");
        setCategoryId("");
        onClose();
        router.refresh();
      },
    );
  }

  return (
    <Dialog open={open} onClose={onClose} title="Create Goal">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="goal-title" className="mb-1.5 block text-sm font-medium text-[var(--foreground-secondary)]">
            Title
          </label>
          <input
            id="goal-title"
            type="text"
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Emergency Fund"
            className="w-full rounded-[calc(var(--radius)-8px)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="goal-description" className="mb-1.5 block text-sm font-medium text-[var(--foreground-secondary)]">
            Description <span className="text-[var(--foreground-muted)]">(optional)</span>
          </label>
          <input
            id="goal-description"
            type="text"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What is this money for?"
            className="w-full rounded-[calc(var(--radius)-8px)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="goal-target-amount" className="mb-1.5 block text-sm font-medium text-[var(--foreground-secondary)]">
              Target amount
            </label>
            <input
              id="goal-target-amount"
              type="number"
              inputMode="decimal"
              required
              min={0.01}
              step="0.01"
              value={targetAmount}
              onChange={(event) => setTargetAmount(event.target.value)}
              placeholder="0.00"
              className="w-full rounded-[calc(var(--radius)-8px)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="goal-target-date" className="mb-1.5 block text-sm font-medium text-[var(--foreground-secondary)]">
              Target date <span className="text-[var(--foreground-muted)]">(optional)</span>
            </label>
            <input
              id="goal-target-date"
              type="date"
              value={targetDate}
              onChange={(event) => setTargetDate(event.target.value)}
              className="w-full rounded-[calc(var(--radius)-8px)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="goal-type" className="mb-1.5 block text-sm font-medium text-[var(--foreground-secondary)]">
              Goal type
            </label>
            <select
              id="goal-type"
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
          <div>
            <label htmlFor="goal-priority" className="mb-1.5 block text-sm font-medium text-[var(--foreground-secondary)]">
              Priority
            </label>
            <select
              id="goal-priority"
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
        </div>

        <div>
          <span className="mb-1.5 block text-sm font-medium text-[var(--foreground-secondary)]">Color</span>
          <div className="flex gap-2">
            {GOAL_COLOR_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setColor(option)}
                aria-label={`Use color ${option}`}
                aria-pressed={color === option}
                className="h-7 w-7 rounded-full ring-offset-2 ring-offset-[var(--surface)] transition-shadow"
                style={{ backgroundColor: option, boxShadow: color === option ? "0 0 0 2px var(--foreground)" : "none" }}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="goal-account" className="mb-1.5 block text-sm font-medium text-[var(--foreground-secondary)]">
              Linked account <span className="text-[var(--foreground-muted)]">(optional)</span>
            </label>
            <select
              id="goal-account"
              value={accountId}
              onChange={(event) => setAccountId(event.target.value)}
              className="w-full rounded-[calc(var(--radius)-8px)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
            >
              <option value="">None</option>
              {linkableAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="goal-category" className="mb-1.5 block text-sm font-medium text-[var(--foreground-secondary)]">
              Linked category <span className="text-[var(--foreground-muted)]">(optional)</span>
            </label>
            <select
              id="goal-category"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className="w-full rounded-[calc(var(--radius)-8px)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
            >
              <option value="">None</option>
              {linkableCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {create.error && (
          <div role="alert" className="rounded-[calc(var(--radius)-8px)] bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
            <p>{create.error.message}</p>
            {create.error.fieldErrors && (
              <ul className="mt-1 list-inside list-disc">
                {Object.entries(create.error.fieldErrors).map(([field, messages]) => (
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
            disabled={create.isPending}
            className="rounded-[calc(var(--radius)-8px)] bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
          >
            {create.isPending ? "Creating…" : "Create Goal"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
