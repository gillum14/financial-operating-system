import { RailCard } from "@/components/ui/rail-card";

// TECH DEBT: a "daily mission" (a rotating, time-boxed task with a reset
// timer and real progress) requires a Missions domain that doesn't exist
// yet. No fake countdown, progress bar, or point value invented.
export function DailyMissionCard() {
  return (
    <RailCard title="Daily Mission">
      <p className="text-sm text-[var(--foreground-secondary)]">No daily mission available yet.</p>
      <p className="mt-1 text-xs text-[var(--foreground-muted)]">This will appear once missions launch.</p>
    </RailCard>
  );
}
