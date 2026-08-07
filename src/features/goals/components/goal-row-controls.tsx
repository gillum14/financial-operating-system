"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2, Landmark, Pause, Pencil, Play, PlusCircle, Archive as ArchiveIcon } from "lucide-react";
import { useState } from "react";

import type { AllocatableAccountOption, GoalRow } from "@/application/goals/goals-views";
import { archiveGoal, completeGoal, pauseGoal, resumeGoal } from "@/features/goals/actions";
import { useServerAction } from "@/lib/actions/use-action";

import { AddContributionDialog } from "./add-contribution-dialog";
import { AllocateFundsDialog } from "./allocate-funds-dialog";
import { EditGoalDialog } from "./edit-goal-dialog";

// Small edit/action island embedded in an otherwise server-rendered goal
// row (GoalsOverviewCard) — only this control needs client-side
// interactivity, mirroring AllocationRowControls' "server row, client
// island" split.
export function GoalRowControls({ goal, allocatableAccounts }: { goal: GoalRow; allocatableAccounts: AllocatableAccountOption[] }) {
  const [dialog, setDialog] = useState<"contribute" | "edit" | "allocate" | null>(null);
  const router = useRouter();

  const complete = useServerAction(completeGoal);
  const archive = useServerAction(archiveGoal);
  const pause = useServerAction(pauseGoal);
  const resume = useServerAction(resumeGoal);

  function handleComplete() {
    if (!window.confirm(`Mark "${goal.title}" as completed?`)) return;
    complete.run({ goalId: goal.id }, () => router.refresh());
  }

  function handleArchive() {
    if (!window.confirm(`Archive "${goal.title}"? It will be hidden from totals but never deleted.`)) return;
    archive.run({ goalId: goal.id }, () => router.refresh());
  }

  function handlePause() {
    if (!window.confirm(`Pause "${goal.title}"? It will stop accepting new contributions or allocations until resumed.`)) return;
    pause.run({ goalId: goal.id }, () => router.refresh());
  }

  function handleResume() {
    resume.run({ goalId: goal.id }, () => router.refresh());
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {goal.canFund && (
          <button
            type="button"
            onClick={() => setDialog("allocate")}
            className="flex items-center gap-1.5 rounded-[calc(var(--radius)-8px)] border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--foreground-secondary)] hover:bg-[var(--surface-hover)]"
          >
            <Landmark className="h-3.5 w-3.5" strokeWidth={1.75} />
            Allocate Funds
          </button>
        )}

        {goal.canFund && (
          <button
            type="button"
            onClick={() => setDialog("contribute")}
            className="flex items-center gap-1.5 rounded-[calc(var(--radius)-8px)] border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--foreground-secondary)] hover:bg-[var(--surface-hover)]"
          >
            <PlusCircle className="h-3.5 w-3.5" strokeWidth={1.75} />
            Add Contribution
          </button>
        )}

        {goal.isEditable && (
          <button
            type="button"
            onClick={() => setDialog("edit")}
            aria-label={`Edit ${goal.title}`}
            className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--foreground-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
          >
            <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
        )}

        {goal.canComplete && (
          <button
            type="button"
            onClick={handleComplete}
            disabled={complete.isPending}
            aria-label={`Mark ${goal.title} as completed`}
            className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--success)] hover:bg-[var(--success)]/10 disabled:opacity-60"
          >
            <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
        )}

        {goal.canPause && (
          <button
            type="button"
            onClick={handlePause}
            disabled={pause.isPending}
            aria-label={`Pause ${goal.title}`}
            className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--foreground-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] disabled:opacity-60"
          >
            <Pause className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
        )}

        {goal.canResume && (
          <button
            type="button"
            onClick={handleResume}
            disabled={resume.isPending}
            aria-label={`Resume ${goal.title}`}
            className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--primary)] hover:bg-[var(--primary)]/10 disabled:opacity-60"
          >
            <Play className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
        )}

        {goal.status !== "archived" && (
          <button
            type="button"
            onClick={handleArchive}
            disabled={archive.isPending}
            aria-label={`Archive ${goal.title}`}
            className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--foreground-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] disabled:opacity-60"
          >
            <ArchiveIcon className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
        )}
      </div>

      <AddContributionDialog
        open={dialog === "contribute"}
        onClose={() => setDialog(null)}
        goalId={goal.id}
        goalTitle={goal.title}
      />
      <AllocateFundsDialog
        open={dialog === "allocate"}
        onClose={() => setDialog(null)}
        goalId={goal.id}
        goalTitle={goal.title}
        accountOptions={allocatableAccounts}
      />
      <EditGoalDialog open={dialog === "edit"} onClose={() => setDialog(null)} goal={goal} />
    </>
  );
}
