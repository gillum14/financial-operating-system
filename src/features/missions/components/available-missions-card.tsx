import { Unlock } from "lucide-react";

import Card from "@/components/ui/card";
import CardHeader from "@/components/ui/card-header";

// TECH DEBT: "available" missions (unlocked but not yet started) require
// the same non-existent Missions domain as Active Missions.
export function AvailableMissionsCard() {
  return (
    <Card>
      <CardHeader title="Available Missions" />

      <div className="flex flex-col items-center justify-center rounded-[calc(var(--radius)-8px)] border border-dashed border-[var(--border)] px-6 py-8 text-center">
        <Unlock className="h-6 w-6 text-[var(--foreground-muted)]" strokeWidth={1.5} />
        <p className="mt-3 text-sm font-medium text-[var(--foreground-secondary)]">No missions available yet</p>
        <p className="mt-1 max-w-xs text-xs text-[var(--foreground-muted)]">
          New missions will appear here once this feature launches.
        </p>
      </div>
    </Card>
  );
}
