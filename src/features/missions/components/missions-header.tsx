import { Compass } from "lucide-react";

export function MissionsHeader() {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch lg:justify-between">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">Missions</h1>
        <p className="mt-1 text-sm text-[var(--foreground-muted)]">
          Clear, real actions that build on your accounts, budget, and goals.
        </p>
      </div>

      <div className="flex items-start gap-4 rounded-[var(--radius)] border border-[var(--primary)]/20 bg-[var(--primary)]/5 p-5 lg:max-w-md">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/15 text-[var(--primary)]">
          <Compass className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div>
          <p className="text-sm font-medium text-[var(--foreground)]">
            Every mission is measured from your real financial data.
          </p>
          <p className="mt-1 text-xs text-[var(--foreground-muted)]">
            Start one below, or check back as your accounts, budget, and goals change.
          </p>
        </div>
      </div>
    </div>
  );
}
