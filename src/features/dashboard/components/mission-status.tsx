import { Flag, Shield, Target, TrendingUp, type LucideIcon } from "lucide-react";

import Card from "@/components/ui/card";
import CardHeader from "@/components/ui/card-header";
import type { MissionStatusItem } from "@/features/dashboard/types";

const STATUS_ICON: Record<string, LucideIcon> = {
  "emergency-fund": Shield,
  "debt-paydown": Target,
  investments: TrendingUp,
  "budget-compliance": Flag,
};

export function MissionStatus({ items }: { items: MissionStatusItem[] }) {
  return (
    <Card>
      <CardHeader title="Mission Status" />

      <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
        {items.map((item) => {
          const Icon = STATUS_ICON[item.id] ?? Shield;
          const tone = item.level === "on-track" ? "var(--success)" : "var(--warning)";

          return (
            <div key={item.id} className="flex flex-col items-start gap-2">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full"
                style={{ backgroundColor: `color-mix(in srgb, ${tone} 15%, transparent)`, color: tone }}
              >
                <Icon className="h-4 w-4" strokeWidth={1.75} />
              </span>

              <p className="text-sm font-medium text-[var(--foreground)]">{item.label}</p>
              <p className="text-sm font-medium" style={{ color: tone }}>
                {item.status}
              </p>
              <p className="text-xs text-[var(--foreground-muted)]">{item.detail}</p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
