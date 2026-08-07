"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { AddAllocationDialog } from "./add-allocation-dialog";

export interface AllocatableCategoryOption {
  id: string;
  name: string;
  parentCategoryId: string | null;
}

export function AddAllocationTrigger({
  budgetPeriodId,
  categoryOptions,
}: {
  budgetPeriodId: string;
  categoryOptions: AllocatableCategoryOption[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 flex items-center gap-2 rounded-[calc(var(--radius)-8px)] border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground-secondary)] hover:bg-[var(--surface-hover)]"
      >
        <Plus className="h-4 w-4" strokeWidth={1.75} />
        Add Category
      </button>

      <AddAllocationDialog
        open={open}
        onClose={() => setOpen(false)}
        budgetPeriodId={budgetPeriodId}
        categoryOptions={categoryOptions}
      />
    </>
  );
}
