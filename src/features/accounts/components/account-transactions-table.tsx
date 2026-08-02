import Card from "@/components/ui/card";
import type { AccountActivityItem } from "@/application/accounts/accounts-views";

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(`${dateString}T00:00:00`),
  );
}

export function AccountTransactionsTable({ activity }: { activity: AccountActivityItem[] }) {
  if (activity.length === 0) {
    return (
      <Card>
        <p className="text-sm text-[var(--foreground-muted)]">No transactions for this account yet.</p>
      </Card>
    );
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-xs font-semibold tracking-[0.06em] text-[var(--foreground-muted)] uppercase">
              <th className="px-6 py-3 font-semibold">Merchant</th>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-6 py-3 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {activity.map((item) => (
              <tr key={item.id} className="border-b border-[var(--border-subtle)] last:border-b-0 hover:bg-[var(--surface-hover)]">
                <td className="px-6 py-3 font-medium text-[var(--foreground)]">{item.merchant}</td>
                <td className="px-4 py-3 text-[var(--foreground-secondary)]">{item.categoryName ?? "Uncategorized"}</td>
                <td className="px-4 py-3 text-[var(--foreground-secondary)]">{formatDate(item.transactionDate)}</td>
                <td
                  className={`px-6 py-3 text-right font-medium ${
                    item.amount < 0 ? "text-[var(--foreground)]" : "text-[var(--success)]"
                  }`}
                >
                  {item.amount < 0 ? "-" : "+"}$
                  {Math.abs(item.amount).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
