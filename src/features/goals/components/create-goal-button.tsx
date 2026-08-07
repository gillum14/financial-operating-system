"use client";

import { ChevronDown, Plus } from "lucide-react";
import { useState } from "react";

import type { LinkableAccountOption, LinkableCategoryOption } from "@/application/goals/goals-views";

import { CreateGoalDialog } from "./create-goal-dialog";

export function CreateGoalButton({
  linkableAccounts,
  linkableCategories,
}: {
  linkableAccounts: LinkableAccountOption[];
  linkableCategories: LinkableCategoryOption[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex shrink-0 items-center gap-2 rounded-[calc(var(--radius)-8px)] bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
      >
        <Plus className="h-4 w-4" strokeWidth={2} />
        Create Goal
        <ChevronDown className="h-4 w-4" strokeWidth={2} />
      </button>

      <CreateGoalDialog
        open={open}
        onClose={() => setOpen(false)}
        linkableAccounts={linkableAccounts}
        linkableCategories={linkableCategories}
      />
    </>
  );
}
