import Card from "@/components/ui/card";
import CardHeader from "@/components/ui/card-header";
import type { ActivityItem } from "@/features/dashboard/types";

const AVATAR_TONES = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];

export function RecentActivity({ activity }: { activity: ActivityItem[] }) {
  return (
    <Card>
      <CardHeader title="Recent Activity">
        <a href="#" className="text-sm font-medium text-[var(--primary)] hover:underline">
          View all
        </a>
      </CardHeader>

      <ul className="space-y-4">
        {activity.map((item, index) => {
          const tone = AVATAR_TONES[index % AVATAR_TONES.length];

          return (
            <li key={item.id} className="flex items-center gap-3">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                style={{ backgroundColor: tone }}
              >
                {item.merchant.charAt(0)}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[var(--foreground)]">{item.merchant}</p>
                <p className="truncate text-xs text-[var(--foreground-muted)]">{item.date}</p>
              </div>

              <div className="shrink-0 text-right">
                <p className="text-sm font-medium text-[var(--danger)]">-${Math.abs(item.amount).toFixed(2)}</p>
                <p className="mt-1 text-xs text-[var(--foreground-muted)]">{item.category}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
