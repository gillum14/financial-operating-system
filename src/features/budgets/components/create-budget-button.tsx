"use client";

import { ChevronDown, Plus } from "lucide-react";
import { useState } from "react";

import { CreateBudgetDialog } from "./create-budget-dialog";

export function CreateBudgetButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex shrink-0 items-center gap-2 rounded-[calc(var(--radius)-8px)] bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
      >
        <Plus className="h-4 w-4" strokeWidth={2} />
        Create Budget
        <ChevronDown className="h-4 w-4" strokeWidth={2} />
      </button>

      <CreateBudgetDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
