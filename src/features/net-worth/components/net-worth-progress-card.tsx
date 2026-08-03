import { RailCard } from "@/components/ui/rail-card";

// TECH DEBT: progress toward a net-worth goal (current vs. target, an
// estimated date) requires a user-set goal this app doesn't model — no
// Goals domain, no net-worth-target field. No fabricated goal amount,
// percent, or estimated date invented.
export function NetWorthProgressCard() {
  return (
    <RailCard
      title="Net Worth Progress"
      action={
        <button type="button" disabled title="Not available yet" className="cursor-not-allowed text-xs font-medium text-[var(--foreground-muted)] opacity-70">
          View goals
        </button>
      }
    >
      <p className="text-sm text-[var(--foreground-secondary)]">No net worth goal set.</p>
      <p className="mt-1 text-xs text-[var(--foreground-muted)]">Goal tracking isn&apos;t available yet.</p>
    </RailCard>
  );
}
