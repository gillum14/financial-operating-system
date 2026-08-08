import { CheckCircle2 } from "lucide-react";

import type { MissionRow } from "@/application/missions/missions-views";
import Badge from "@/components/ui/badge";
import Card from "@/components/ui/card";
import CardHeader from "@/components/ui/card-header";

import { ArchiveMissionButton } from "./archive-mission-button";

export function CompletedMissionsCard({ missions }: { missions: MissionRow[] }) {
  return (
    <Card>
      <CardHeader title="Completed Missions" />

      {missions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[calc(var(--radius)-8px)] border border-dashed border-[var(--border)] px-6 py-8 text-center">
          <CheckCircle2 className="h-6 w-6 text-[var(--foreground-muted)]" strokeWidth={1.5} />
          <p className="mt-3 text-sm font-medium text-[var(--foreground-secondary)]">No completed missions yet</p>
          <p className="mt-1 max-w-xs text-xs text-[var(--foreground-muted)]">
            Missions you finish will be listed here.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {missions.map((mission) => (
            <li
              key={mission.id}
              className="flex items-start justify-between gap-3 rounded-[calc(var(--radius)-8px)] border border-[var(--border)] p-4"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="success">Completed</Badge>
                  <p className="text-sm font-medium text-[var(--foreground)]">{mission.title}</p>
                </div>
                <p className="mt-1 text-xs text-[var(--foreground-muted)]">{mission.explanation}</p>
                {mission.completedAtLabel && (
                  <p className="mt-1 text-xs text-[var(--foreground-muted)]">Completed {mission.completedAtLabel}</p>
                )}
              </div>
              <ArchiveMissionButton missionId={mission.id} title={mission.title} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
