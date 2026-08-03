import { RailCard } from "@/components/ui/rail-card";

// TECH DEBT: "on track" status is computed per-category against a budget
// period's allocation — no Budget domain exists yet, so there's nothing to
// classify. No donut/chart invented for a status that doesn't exist.
export function OnTrackCard() {
  return (
    <RailCard title="On Track">
      <p className="text-sm text-[var(--foreground-secondary)]">Category tracking isn&apos;t available yet.</p>
      <p className="mt-1 text-xs text-[var(--foreground-muted)]">This will appear once a budget exists.</p>
    </RailCard>
  );
}
