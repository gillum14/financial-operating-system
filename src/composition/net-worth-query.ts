import "server-only";

import { computeNetWorthBreakdown } from "@/application/net-worth/net-worth-breakdown";
import type { NetWorthOverviewView } from "@/application/net-worth/net-worth-views";
import { db } from "@/db/client";
import { DrizzleAccountRepository } from "@/infrastructure/db/accounts-repository";

export type { NetWorthOverviewView };

// Server-only query orchestration for the Net Worth workspace — same role
// as accounts-query.ts, reusing the same repository and the same real
// classification logic (net-worth-breakdown.ts, itself built on
// accounts-summary.ts's summarizeAccounts) rather than a second, parallel
// computation that could quietly disagree with the Accounts page's
// numbers for the same accounts.
//
// TECH DEBT: this only computes what's honestly derivable from a single
// snapshot of current account balances — no historical net-worth
// snapshots (so no "vs prior 30 days" delta, no Net Worth Over Time
// chart), no user-set net-worth goal, and no attributable change log (so
// no "Recent Changes" feed). See the Net Worth page's placeholder cards,
// which render honest empty states for each of those rather than
// fabricate the shape of data they'd need.
const accountRepository = new DrizzleAccountRepository(db);

export async function getNetWorthOverview(ownerId: string): Promise<NetWorthOverviewView> {
  const accounts = await accountRepository.listForOwner(ownerId, "active");
  const breakdown = computeNetWorthBreakdown(accounts);

  return {
    ...breakdown,
    hasAccounts: accounts.length > 0,
  };
}
