import { CheckCircle2 } from "lucide-react";

import Card from "@/components/ui/card";
import CardHeader from "@/components/ui/card-header";

// TECH DEBT: completed-mission history requires the same non-existent
// Missions domain as Active/Available Missions.
export function CompletedMissionsCard() {
  return (
    <Card>
      <CardHeader title="Completed Missions" />

      <div className="flex flex-col items-center justify-center rounded-[calc(var(--radius)-8px)] border border-dashed border-[var(--border)] px-6 py-8 text-center">
        <CheckCircle2 className="h-6 w-6 text-[var(--foreground-muted)]" strokeWidth={1.5} />
        <p className="mt-3 text-sm font-medium text-[var(--foreground-secondary)]">No completed missions yet</p>
        <p className="mt-1 max-w-xs text-xs text-[var(--foreground-muted)]">
          Missions you finish will be listed here once this feature launches.
        </p>
      </div>
    </Card>
  );
}
