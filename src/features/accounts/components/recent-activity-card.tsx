import Card from "@/components/ui/card";
import CardHeader from "@/components/ui/card-header";
import type { AccountActivityItem } from "@/application/accounts/accounts-views";

// Same avatar-tone palette as the dashboard's RecentActivity widget
// (src/features/dashboard/components/recent-activity.tsx) — one visual
// language for a merchant-initial avatar everywhere it appears.
const AVATAR_TONES = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(`${dateString}T00:00:00`));
}

export function RecentActivityCard({
  activity,
  onViewAll,
}: {
  activity: AccountActivityItem[];
  onViewAll: () => void;
}) {
  const items = activity.slice(0, 5);

  return (
    <Card>
      <CardHeader title="Recent activity">
        {activity.length > 0 && (
          <button
            type="button"
            onClick={onViewAll}
            className="text-sm font-medium text-[var(--primary)] hover:underline"
          >
            View all transactions
          </button>
        )}
      </CardHeader>

      {items.length === 0 ? (
        <p className="text-sm text-[var(--foreground-muted)]">No transactions for this account yet.</p>
      ) : (
        <ul className="space-y-4">
          {items.map((item, index) => {
            const tone = AVATAR_TONES[index % AVATAR_TONES.length];
            return (
              <li key={item.id} className="flex items-center gap-3">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                  style={{ backgroundColor: tone }}
                >
                  {item.merchant.charAt(0).toUpperCase()}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--foreground)]">{item.merchant}</p>
                  <p className="truncate text-xs text-[var(--foreground-muted)]">{formatDate(item.transactionDate)}</p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-sm font-medium text-[var(--foreground-secondary)]">
                    {item.amount < 0 ? "-" : "+"}$
                    {Math.abs(item.amount).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                  <p className="mt-1 text-xs text-[var(--foreground-muted)]">{item.categoryName ?? "Uncategorized"}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
