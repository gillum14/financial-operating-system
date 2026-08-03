import { Compass } from "lucide-react";

import Badge from "@/components/ui/badge";

// TECH DEBT: Missions has no domain yet — no schema, service, repository,
// or Server Action. There's no "Create Mission" action here (unlike
// Budgets/Goals) because missions aren't user-created; the entire feature
// is inactive, which this header states plainly rather than implying a
// working feature with an empty first use.
export function MissionsHeader() {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch lg:justify-between">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">Missions</h1>
        <p className="mt-1 text-sm text-[var(--foreground-muted)]">
          Turn your financial habits into progress and earn rewards that matter.
        </p>
        <div className="mt-3">
          <Badge tone="neutral">Feature coming soon &middot; Missions are not yet active</Badge>
        </div>
      </div>

      <div className="flex items-start gap-4 rounded-[var(--radius)] border border-[var(--primary)]/20 bg-[var(--primary)]/5 p-5 lg:max-w-md">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/15 text-[var(--primary)]">
          <Compass className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div>
          <p className="text-sm font-medium text-[var(--foreground)]">
            Complete missions, build momentum, and unlock rewards.
          </p>
          <p className="mt-1 text-xs text-[var(--foreground-muted)]">
            Missions will be personalized to your goals and financial journey.
          </p>
        </div>
      </div>
    </div>
  );
}
