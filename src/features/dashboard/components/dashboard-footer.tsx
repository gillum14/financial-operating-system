import { Lock, RefreshCw } from "lucide-react";

export function DashboardFooter({ lastUpdatedLabel }: { lastUpdatedLabel: string }) {
  return (
    <div className="flex items-center justify-between border-t border-[var(--border-subtle)] pt-4 text-xs text-[var(--foreground-muted)]">
      <span className="flex items-center gap-1.5">
        <Lock className="h-3.5 w-3.5" strokeWidth={1.75} />
        Secure. Private. Encrypted.
      </span>

      <span className="flex items-center gap-1.5">
        {lastUpdatedLabel}
        <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.75} />
      </span>
    </div>
  );
}
