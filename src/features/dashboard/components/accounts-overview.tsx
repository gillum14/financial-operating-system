import { Banknote, CreditCard, Landmark, TrendingUp, type LucideIcon } from "lucide-react";

import Card from "@/components/ui/card";
import CardHeader from "@/components/ui/card-header";
import type { AccountDisplayGroup } from "@/application/dashboard/account-presentation";
import type { DashboardAccountView } from "@/application/dashboard/types";

const DISPLAY_GROUP_ICON: Record<AccountDisplayGroup, LucideIcon> = {
  Cash: Landmark,
  Credit: CreditCard,
  Loans: Banknote,
  Investments: TrendingUp,
  Assets: Landmark,
};

function formatBalance(balance: number) {
  const formatted = `$${Math.abs(balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return balance < 0 ? `-${formatted}` : formatted;
}

export function AccountsOverview({ accounts }: { accounts: DashboardAccountView[] }) {
  return (
    <Card>
      <CardHeader title="Accounts Overview">
        <a href="#" className="text-sm font-medium text-[var(--primary)] hover:underline">
          View all
        </a>
      </CardHeader>

      {accounts.length === 0 ? (
        <p className="text-sm text-[var(--foreground-muted)]">No accounts yet.</p>
      ) : (
        <ul className="space-y-4">
          {accounts.map((account) => {
            const Icon = DISPLAY_GROUP_ICON[account.displayGroup];

            return (
              <li key={account.id} className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[calc(var(--radius)-8px)] bg-[var(--surface-hover)] text-[var(--foreground-secondary)]">
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--foreground)]">{account.name}</p>
                  <p className="truncate text-xs text-[var(--foreground-muted)]">
                    {account.institution ?? "No institution linked"} · {account.displayLabel}
                  </p>
                </div>

                <p className="shrink-0 text-sm font-medium text-[var(--foreground)]">
                  {formatBalance(account.balance)}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
