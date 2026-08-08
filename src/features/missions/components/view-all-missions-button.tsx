"use client";

import { useState } from "react";

import type { MissionCandidateRow } from "@/application/missions/missions-views";

import { ViewAllMissionsModal } from "./view-all-missions-modal";

export function ViewAllMissionsButton({ candidates }: { candidates: MissionCandidateRow[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-[var(--primary)] hover:underline"
      >
        View All Missions
      </button>
      <ViewAllMissionsModal open={open} onClose={() => setOpen(false)} candidates={candidates} />
    </>
  );
}
