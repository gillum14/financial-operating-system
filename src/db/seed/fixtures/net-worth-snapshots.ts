import type { NewAccountBalanceSnapshot } from "../../schema";
import { fixtureId } from "../deterministic";
import { accountFixtures, accountIds, type AccountIds } from "./accounts";

// Twelve calendar month-end dates, oldest first — the sandbox's
// deterministic monthly snapshot history. Hardcoded literals (the
// "explicit deterministic boundaries" the snapshot rules require), not
// computed at fixture-build time: this is a fixed, known set of dates,
// and hardcoding removes any dependency on date-math edge cases.
//
// Aug 2025 through Jul 2026 — the 12 most recently *completed* calendar
// months relative to the sandbox's fixed "as of" anchor
// (SEED_LATEST_TRANSACTION_DATE = 2026-08-04, see window.ts). Aug 2026
// itself is deliberately NOT snapshotted here: that month is still
// in-progress relative to the anchor, and its "current" balance is
// exactly the live accounts.currentBalance value every account fixture
// already carries — historical snapshots only ever cover finished
// months, per SnapshotCaptureService.captureMonthlySnapshot.
export const NET_WORTH_SNAPSHOT_DATES = [
  "2025-08-31",
  "2025-09-30",
  "2025-10-31",
  "2025-11-30",
  "2025-12-31",
  "2026-01-31",
  "2026-02-28",
  "2026-03-31",
  "2026-04-30",
  "2026-05-31",
  "2026-06-30",
  "2026-07-31",
] as const;

interface AccountTrend {
  // Balance 12 months before the account's live currentBalance (fixture
  // index 0, Aug 2025) — the trend's starting point. The endpoint is
  // never a second hardcoded number: it's read directly off the real
  // account fixture's currentBalance in netWorthSnapshotFixtures below,
  // so history always lines up with "today" instead of drifting from it.
  startBalance: number;
  // A one-month "market correction" dip applied at this index only, as a
  // percentage cut off that month's trend value — the following month
  // resumes the ORIGINAL trend line (not compounded), producing a sharp
  // V-shaped dip-and-recover rather than a permanent shift. This is what
  // gives the sandbox its required "at least one month with Net Worth
  // decline": brokerage/401(k)/Roth IRA dip together in April 2026
  // (index 8), simulating a market-wide correction large enough that the
  // combined asset drop exceeds that month's organic growth across every
  // other account.
  dipAtIndex?: number;
  dipFactor?: number;
}

const MARKET_DIP_INDEX = 8; // 2026-04-30
const MARKET_DIP_FACTOR = 0.1;

// Every account trends toward its own real current balance (see above) —
// only the 12-months-ago starting point and, for the three market-linked
// accounts, the dip are configured here. Trend direction per account:
// checking/emergencySavings/householdSavings/cd rise (savings changes);
// creditCard/cashbackCreditCard/mortgage/autoLoan rise TOWARD zero
// (liability reduction — these are stored as negative balances, so a
// smaller magnitude is a larger, less-negative number); property
// appreciates and mortgage pays down together (property/mortgage equity
// movement); brokerage/401(k)/rothIra grow with the shared market dip
// (investment/retirement growth, including one decline month).
const ACCOUNT_TRENDS: Record<keyof AccountIds, AccountTrend> = {
  checking: { startBalance: 4200.0 },
  emergencySavings: { startBalance: 14800.0 },
  householdSavings: { startBalance: 5100.0 },
  creditCard: { startBalance: -1850.0 },
  cashbackCreditCard: { startBalance: -980.0 },
  mortgage: { startBalance: -324000.0 },
  property: { startBalance: 415000.0 },
  autoLoan: { startBalance: -17430.32 },
  brokerage: { startBalance: 34200.0, dipAtIndex: MARKET_DIP_INDEX, dipFactor: MARKET_DIP_FACTOR },
  k401: { startBalance: 82100.0, dipAtIndex: MARKET_DIP_INDEX, dipFactor: MARKET_DIP_FACTOR },
  rothIra: { startBalance: 19400.0, dipAtIndex: MARKET_DIP_INDEX, dipFactor: MARKET_DIP_FACTOR },
  cd: { startBalance: 9850.0 },
};

// Linear interpolation from `start` (index 0) toward `end`, reaching `end`
// only at index === totalSteps (one step past the last stored snapshot,
// i.e. the live "today" value) — so the last stored snapshot (index
// totalSteps - 1) sits just short of the current balance, exactly the gap
// one more monthly step would close. This is what makes the sandbox's
// current dynamic net worth read as a natural continuation of the
// historical trend rather than a discontinuous jump.
function interpolate(start: number, end: number, index: number, totalSteps: number): number {
  return start + ((end - start) * index) / totalSteps;
}

// CANONICAL SANDBOX ONLY (task §6): deterministic historical snapshot
// fixtures are seeded here purely because the sandbox's account balances
// are themselves deterministic fixtures with known 12-months-ago values —
// this is never how a real user's first snapshot behaves. A real owner
// with no history gets an honest "history unavailable" state (see
// net-worth-query.ts) and their first-ever snapshot establishes their
// baseline from that point forward; nothing here fabricates history for
// a real user from their current balances.
export function netWorthSnapshotFixtures(ownerId: string): NewAccountBalanceSnapshot[] {
  const ids = accountIds(ownerId);
  const accountById = new Map(accountFixtures(ownerId).map((account) => [account.id, account]));
  const totalSteps = NET_WORTH_SNAPSHOT_DATES.length;

  const rows: NewAccountBalanceSnapshot[] = [];

  for (const key of Object.keys(ids) as (keyof AccountIds)[]) {
    const accountId = ids[key];
    const account = accountById.get(accountId);
    if (!account) continue;

    const trend = ACCOUNT_TRENDS[key];
    const currentBalance = Number(account.currentBalance ?? "0");

    NET_WORTH_SNAPSHOT_DATES.forEach((snapshotDate, index) => {
      let balance = interpolate(trend.startBalance, currentBalance, index, totalSteps);
      if (trend.dipAtIndex === index) {
        balance *= 1 - (trend.dipFactor ?? 0);
      }

      rows.push({
        id: fixtureId(ownerId, `net-worth-snapshot:${key}:${snapshotDate}`),
        ownerId,
        accountId,
        snapshotDate,
        balance: balance.toFixed(2),
        accountType: account.accountType,
        balanceSource: account.balanceSource ?? "manual",
        snapshotType: "monthly",
      });
    });
  }

  return rows;
}
