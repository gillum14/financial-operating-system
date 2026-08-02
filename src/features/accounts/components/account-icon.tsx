import { Banknote, CreditCard, Landmark, TrendingUp, type LucideIcon } from "lucide-react";

import type { AccountDisplayGroup } from "@/application/dashboard/account-presentation";

// Same icon-per-group mapping as the dashboard's AccountsOverview widget
// (src/features/dashboard/components/accounts-overview.tsx) — one visual
// language for "what kind of account is this" everywhere it appears.
const DISPLAY_GROUP_ICON: Record<AccountDisplayGroup, LucideIcon> = {
  Cash: Landmark,
  Credit: CreditCard,
  Loans: Banknote,
  Investments: TrendingUp,
  Assets: Landmark,
};

export function AccountIcon({ group, className = "h-4 w-4" }: { group: AccountDisplayGroup; className?: string }) {
  const Icon = DISPLAY_GROUP_ICON[group];
  return <Icon className={className} strokeWidth={1.75} />;
}
