import { RailCard } from "@/components/ui/rail-card";

// TECH DEBT: "on track / behind / at risk" status is computed per-goal
// against its target date and target amount — no Goals domain exists yet,
// so there's nothing to classify. No donut/chart invented for a status
// that doesn't exist (same reasoning as Budgets' OnTrackCard).
export function ProgressSummaryCard() {
  return (
    <RailCard title="Progress Summary">
      <p className="text-sm text-[var(--foreground-secondary)]">Progress tracking isn&apos;t available yet.</p>
      <p className="mt-1 text-xs text-[var(--foreground-muted)]">This will appear once goals exist.</p>
    </RailCard>
  );
}
