"use client";

import { useRouter } from "next/navigation";

import type { MissionCandidateRow } from "@/application/missions/missions-views";
import { startMission } from "@/features/missions/actions";
import { useServerAction } from "@/lib/actions/use-action";

// isDailyMission defaults to false — only DailyMissionCard passes true,
// locking in the one-time +25 XP bonus for a mission started from that
// specific spotlight (see missions.is_daily_mission's schema comment).
export function StartMissionButton({ candidate, isDailyMission = false }: { candidate: MissionCandidateRow; isDailyMission?: boolean }) {
  const router = useRouter();
  const start = useServerAction(startMission);

  function handleStart() {
    start.run(
      {
        missionType: candidate.missionType,
        relatedGoalId: candidate.relatedGoalId,
        relatedAccountId: candidate.relatedAccountId,
        relatedBudgetPeriodId: candidate.relatedBudgetPeriodId,
        isDailyMission,
      },
      () => router.refresh(),
    );
  }

  return (
    <div className="shrink-0">
      <button
        type="button"
        onClick={handleStart}
        disabled={start.isPending}
        className="whitespace-nowrap rounded-[calc(var(--radius)-8px)] bg-[var(--primary)] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {start.isPending ? "Starting..." : "Start Mission"}
      </button>
      {start.error && <p className="mt-1 text-xs text-[var(--danger)]">{start.error.message}</p>}
    </div>
  );
}
