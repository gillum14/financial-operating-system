import { Compass } from "lucide-react";

import type { MissionRow } from "@/application/missions/missions-views";
import Badge from "@/components/ui/badge";
import Card from "@/components/ui/card";
import CardHeader from "@/components/ui/card-header";
import ProgressBar from "@/components/ui/progress-bar";

import { ArchiveMissionButton } from "./archive-mission-button";
import { CompleteCustomMissionButton } from "./complete-custom-mission-button";

export function ActiveMissionsCard({ missions }: { missions: MissionRow[] }) {
  return (
    <Card>
      <CardHeader title="Active Missions" />

      {missions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[calc(var(--radius)-8px)] border border-dashed border-[var(--border)] px-6 py-12 text-center">
          <Compass className="h-6 w-6 text-[var(--foreground-muted)]" strokeWidth={1.5} />
          <p className="mt-3 text-sm font-medium text-[var(--foreground-secondary)]">No active missions</p>
          <p className="mt-1 max-w-xs text-xs text-[var(--foreground-muted)]">
            Start one from Available Missions below.
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {missions.map((mission) => (
            <li key={mission.id} className="rounded-[calc(var(--radius)-8px)] border border-[var(--border)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-[var(--foreground)]">{mission.title}</p>
                    {mission.relatedPillarLabel && <Badge tone="primary">Supports: {mission.relatedPillarLabel}</Badge>}
                    <span className="text-xs font-medium text-[var(--primary)]">{mission.xpLabel}</span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--foreground-muted)]">{mission.description}</p>
                </div>
                <div className="flex items-center gap-1">
                  {mission.canMarkComplete && <CompleteCustomMissionButton missionId={mission.id} title={mission.title} />}
                  <ArchiveMissionButton missionId={mission.id} title={mission.title} />
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1">
                  <ProgressBar percent={mission.completionPercent} />
                </div>
                <span className="text-xs text-[var(--foreground-muted)]">{mission.completionPercent}%</span>
              </div>

              <p className="mt-2 text-xs text-[var(--foreground-muted)]">{mission.explanation}</p>
              <p className="mt-1 text-xs text-[var(--foreground-muted)]">Started {mission.startedAtLabel}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
