import "server-only";

import type { BudgetsOverviewView } from "@/application/budgets/budgets-views";

export type { BudgetsOverviewView };

// Server-only query orchestration for the Budgets workspace — same role as
// transactions-query.ts / accounts-query.ts, but with no repository behind
// it yet: there is no Budget domain (no schema table, no
// DrizzleBudgetRepository) to query. Kept as a real composition function,
// not inlined in the page, so the Budgets page already follows the read
// path (Server Component -> composition -> view model) it will use once a
// real repository exists — swapping the body for a real query later won't
// change this function's signature or any caller.
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- ownerId will scope the real repository query once a Budget domain exists.
export async function getBudgetsOverview(ownerId: string): Promise<BudgetsOverviewView> {
  return { hasBudget: false };
}
