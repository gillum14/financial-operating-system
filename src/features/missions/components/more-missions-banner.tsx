import { Lock } from "lucide-react";

import Card from "@/components/ui/card";

export function MoreMissionsBanner() {
  return (
    <Card className="flex items-center gap-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-hover)] text-[var(--foreground-muted)]">
        <Lock className="h-4 w-4" strokeWidth={1.75} />
      </span>
      <div>
        <p className="text-sm font-medium text-[var(--foreground)]">More missions coming soon</p>
        <p className="mt-0.5 text-xs text-[var(--foreground-muted)]">
          We&apos;re building more missions to help you grow your wealth and achieve your goals.
        </p>
      </div>
    </Card>
  );
}
