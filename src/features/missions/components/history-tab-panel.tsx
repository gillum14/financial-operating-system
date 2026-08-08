import { Award, CheckCircle2, History, Star, type LucideIcon } from "lucide-react";

import type { MissionHistoryDayGroup, MissionHistoryEventKind } from "@/application/missions/missions-views";
import Card from "@/components/ui/card";
import CardHeader from "@/components/ui/card-header";

// A chronological activity feed, grouped by calendar day — every event
// (mission completions with their XP, reward unlocks, derived level-ups)
// comes straight from missions-query.ts's buildHistoryEvents, itself
// built entirely from data the Mission Progression System already
// persists. This component only formats what the server already decided;
// no event kind, XP total, or level number is computed here.
const EVENT_ICON: Record<MissionHistoryEventKind, LucideIcon> = {
  "mission-completed": CheckCircle2,
  "reward-unlocked": Award,
  "level-up": Star,
};

const EVENT_ICON_CLASSNAME: Record<MissionHistoryEventKind, string> = {
  "mission-completed": "bg-[var(--success)]/15 text-[var(--success)]",
  "reward-unlocked": "bg-[var(--primary)]/15 text-[var(--primary)]",
  "level-up": "bg-[var(--warning)]/15 text-[var(--warning)]",
};

export function HistoryTabPanel({ history }: { history: MissionHistoryDayGroup[] }) {
  const hasAny = history.length > 0;

  return (
    <Card>
      <CardHeader title="History" />

      {!hasAny ? (
        <div className="flex flex-col items-center justify-center rounded-[calc(var(--radius)-8px)] border border-dashed border-[var(--border)] px-6 py-8 text-center">
          <History className="h-6 w-6 text-[var(--foreground-muted)]" strokeWidth={1.5} />
          <p className="mt-3 text-sm font-medium text-[var(--foreground-secondary)]">No activity yet</p>
          <p className="mt-1 max-w-xs text-xs text-[var(--foreground-muted)]">
            Complete a mission to start building your history.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {history.map((group) => (
            <div key={group.dateLabel}>
              <p className="text-xs font-semibold tracking-[0.12em] text-[var(--foreground-muted)] uppercase">{group.dateLabel}</p>
              <ul className="mt-3 space-y-2">
                {group.events.map((event) => {
                  const Icon = EVENT_ICON[event.kind];
                  return (
                    <li
                      key={event.id}
                      className="flex items-start gap-3 rounded-[calc(var(--radius)-8px)] border border-[var(--border)] p-3"
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${EVENT_ICON_CLASSNAME[event.kind]}`}
                      >
                        <Icon className="h-4 w-4" strokeWidth={1.75} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-0.5">
                          <p className="text-sm font-medium text-[var(--foreground)]">{event.title}</p>
                          <span className="shrink-0 text-xs text-[var(--foreground-muted)]">{event.timeLabel}</span>
                        </div>
                        {event.detail && <p className="text-xs text-[var(--foreground-muted)]">{event.detail}</p>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
