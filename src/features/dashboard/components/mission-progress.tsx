import ProgressBar from "@/components/ui/progress-bar";
import type { MissionProgressItem } from "@/features/dashboard/types";

export function MissionProgress({ missions }: { missions: MissionProgressItem[] }) {
  return (
    <div className="mx-auto mt-4 w-full text-center">
      <p className="text-xs font-semibold tracking-[0.14em] text-[var(--foreground-muted)] uppercase">
        Progress
      </p>

      <div className="mt-3 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
        {missions.map((mission) => (
          <div key={mission.id} className="text-left">
            <p className="text-sm text-[var(--foreground-secondary)]">{mission.label}</p>

            <div className="mt-1.5 flex items-center gap-2">
              <div className="flex-1">
                <ProgressBar percent={mission.percent} />
              </div>
              <span className="text-xs text-[var(--foreground-muted)]">{mission.percent}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
