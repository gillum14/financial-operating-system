"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import Dialog from "@/components/ui/dialog";
import { addBudgetAllocation } from "@/features/budgets/actions";
import { useServerAction } from "@/lib/actions/use-action";

export interface AllocatableCategoryOption {
  id: string;
  name: string;
  parentCategoryId: string | null;
}

export function AddAllocationDialog({
  open,
  onClose,
  budgetPeriodId,
  categoryOptions,
}: {
  open: boolean;
  onClose: () => void;
  budgetPeriodId: string;
  // Already excludes categories this period has allocated — see
  // BudgetsOverviewView.allocatableCategories.
  categoryOptions: AllocatableCategoryOption[];
}) {
  const [categoryId, setCategoryId] = useState(categoryOptions[0]?.id ?? "");
  const [plannedAmount, setPlannedAmount] = useState("");
  const router = useRouter();

  const addAllocation = useServerAction(addBudgetAllocation);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(plannedAmount);
    if (!categoryId || !Number.isFinite(amount) || amount < 0) return;

    addAllocation.run({ budgetPeriodId, categoryId, plannedAmount: amount }, () => {
      setPlannedAmount("");
      onClose();
      router.refresh();
    });
  }

  const noCategoriesLeft = categoryOptions.length === 0;

  return (
    <Dialog open={open} onClose={onClose} title="Add Category">
      {noCategoriesLeft ? (
        <p className="text-sm text-[var(--foreground-secondary)]">
          Every category is already allocated in this budget. Create a new category on the Categories page to add
          more.
        </p>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="allocation-category" className="mb-1.5 block text-sm font-medium text-[var(--foreground-secondary)]">
              Category
            </label>
            <select
              id="allocation-category"
              required
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className="w-full rounded-[calc(var(--radius)-8px)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
            >
              {categoryOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="allocation-amount" className="mb-1.5 block text-sm font-medium text-[var(--foreground-secondary)]">
              Planned amount
            </label>
            <input
              id="allocation-amount"
              type="number"
              inputMode="decimal"
              required
              min={0}
              step="0.01"
              value={plannedAmount}
              onChange={(event) => setPlannedAmount(event.target.value)}
              placeholder="0.00"
              className="w-full rounded-[calc(var(--radius)-8px)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
            />
            <p className="mt-1 text-xs text-[var(--foreground-muted)]">
              Savings and investment categories are valid allocations too — zero-based budgeting treats them as a
              purpose, not spending.
            </p>
          </div>

          {addAllocation.error && (
            <div role="alert" className="rounded-[calc(var(--radius)-8px)] bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
              <p>{addAllocation.error.message}</p>
              {addAllocation.error.fieldErrors && (
                <ul className="mt-1 list-inside list-disc">
                  {Object.entries(addAllocation.error.fieldErrors).map(([field, messages]) => (
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
              disabled={addAllocation.isPending}
              className="rounded-[calc(var(--radius)-8px)] bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
            >
              {addAllocation.isPending ? "Adding…" : "Add Category"}
            </button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
