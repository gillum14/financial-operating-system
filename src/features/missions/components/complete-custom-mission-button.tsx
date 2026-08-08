"use client";

import { CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { completeCustomMission } from "@/features/missions/actions";
import { useServerAction } from "@/lib/actions/use-action";

// Only ever rendered when MissionRow.canMarkComplete is true (missionType
// "custom" and status active) — the one manual completion control in the
// system, restricted server-side by MissionService.completeCustomMission
// itself as well, not just by this button only appearing here.
export function CompleteCustomMissionButton({ missionId, title }: { missionId: string; title: string }) {
  const router = useRouter();
  const complete = useServerAction(completeCustomMission);

  function handleComplete() {
    if (!window.confirm(`Mark "${title}" as complete?`)) return;
    complete.run({ missionId }, () => router.refresh());
  }

  return (
    <button
      type="button"
      onClick={handleComplete}
      disabled={complete.isPending}
      aria-label={`Mark ${title} as complete`}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--success)] hover:bg-[var(--success)]/10 disabled:opacity-60"
    >
      <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.75} />
    </button>
  );
}
