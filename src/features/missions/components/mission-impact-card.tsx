import { RailCard } from "@/components/ui/rail-card";

// TECH DEBT: "impact" figures (spending under control, goals supported,
// days of progress, missions completed) are all mission-derived — no
// Missions domain exists yet. Deliberately NOT backfilled from real
// Transactions/Goals data either: that would misrepresent ordinary
// spending or goal progress as mission-driven impact it was never
// attributed to.
export function MissionImpactCard() {
  return (
    <RailCard title="Mission Impact">
      <p className="text-sm text-[var(--foreground-secondary)]">Mission impact isn&apos;t available yet.</p>
      <p className="mt-1 text-xs text-[var(--foreground-muted)]">This will appear once missions launch.</p>
    </RailCard>
  );
}
