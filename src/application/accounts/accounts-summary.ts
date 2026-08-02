import { getAccountPresentation } from "@/application/dashboard/account-presentation";
import type { Account } from "@/domains/accounts/types";

export interface AccountsSummary {
  youHave: number;
  youOwe: number;
  difference: number;
}

// Credit and Loans are the two display groups whose accountType values are
// liabilities (see account-presentation.ts) — everything else (Cash,
// Investments, Assets) is asset-like. This mirrors DashboardService's own
// documented assumption that liability balances are stored as negative
// numbers; "You Owe" reports that as a positive magnitude, matching the
// mockup's presentation.
const LIABILITY_GROUPS = new Set(["Credit", "Loans"]);

// "You Have" / "You Owe" / "Difference" for the Accounts workspace —
// active-account balances only (callers pass an already-active-filtered
// list), using the same canonical account-type classification as the
// dashboard, not a new one invented for this page.
export function summarizeAccounts(accounts: Account[]): AccountsSummary {
  let youHave = 0;
  let youOwe = 0;

  for (const account of accounts) {
    const balance = account.currentBalance ? Number(account.currentBalance) : 0;
    const { group } = getAccountPresentation(account.accountType);

    if (LIABILITY_GROUPS.has(group)) {
      youOwe += Math.abs(balance);
    } else {
      youHave += balance;
    }
  }

  return { youHave, youOwe, difference: youHave - youOwe };
}
