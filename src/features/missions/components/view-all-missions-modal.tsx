"use client";

import { useState } from "react";
import { Plus, Unlock } from "lucide-react";

import type { MissionCandidateRow } from "@/application/missions/missions-views";
import Badge from "@/components/ui/badge";
import Dialog from "@/components/ui/dialog";

import { CreateCustomMissionForm } from "./create-custom-mission-form";
import { StartMissionButton } from "./start-mission-button";

// The full, unshortened candidate list — Available Missions on the main
// page shows only the top few (missions-query.ts's topCandidates); this
// modal is the one place to see and start every currently-eligible real
// mission, plus create a custom one. Scrollable rather than paginated —
// the candidate list is always small (deterministic eligibility over a
// handful of real accounts/goals/budget/transactions/confidence), so a
// max-height scroll area is simpler than real pagination for no loss of
// usability.
export function ViewAllMissionsModal({
  open,
  onClose,
  candidates,
}: {
  open: boolean;
  onClose: () => void;
  candidates: MissionCandidateRow[];
}) {
  const [showCreateForm, setShowCreateForm] = useState(false);

  function handleClose() {
    setShowCreateForm(false);
    onClose();
  }

  return (
    <Dialog open={open} onClose={handleClose} title="All Available Missions" size="lg">
      <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
        {showCreateForm ? (
          <CreateCustomMissionForm onDone={() => setShowCreateForm(false)} />
        ) : (
          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            className="flex w-full items-center justify-center gap-2 rounded-[calc(var(--radius)-8px)] border border-dashed border-[var(--border)] px-4 py-3 text-sm font-medium text-[var(--foreground-secondary)] hover:bg-[var(--surface-hover)]"
          >
            <Plus className="h-4 w-4" strokeWidth={1.75} />
            Create Custom Mission
          </button>
        )}

        {candidates.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[calc(var(--radius)-8px)] border border-dashed border-[var(--border)] px-6 py-8 text-center">
            <Unlock className="h-6 w-6 text-[var(--foreground-muted)]" strokeWidth={1.5} />
            <p className="mt-3 text-sm font-medium text-[var(--foreground-secondary)]">No missions available right now</p>
            <p className="mt-1 max-w-xs text-xs text-[var(--foreground-muted)]">
              As your accounts, budget, and goals change, new missions will appear here.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {candidates.map((candidate) => (
              <li
                key={`${candidate.missionType}:${candidate.relatedGoalId ?? candidate.relatedAccountId ?? candidate.relatedBudgetPeriodId ?? ""}`}
                className="flex flex-col gap-3 rounded-[calc(var(--radius)-8px)] border border-[var(--border)] p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-[var(--foreground)]">{candidate.title}</p>
                    {candidate.relatedPillarLabel && <Badge tone="primary">Supports: {candidate.relatedPillarLabel}</Badge>}
                    <span className="text-xs font-medium text-[var(--primary)]">{candidate.xpLabel}</span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--foreground-muted)]">{candidate.description}</p>
                  <p className="mt-1 text-xs text-[var(--foreground-muted)]">{candidate.explanation}</p>
                </div>

                <StartMissionButton candidate={candidate} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </Dialog>
  );
}
