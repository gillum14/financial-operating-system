import type { NewBudgetAllocation, NewBudgetPeriod } from "../../schema";
import { compareDates, fixtureId } from "../deterministic";
import { categoryIdByName } from "./categories";
import { SEED_LATEST_TRANSACTION_DATE } from "./window";

// Budget periods align to real calendar months so their date range matches
// real transaction activity exactly — no separate "budget window" concept
// invented alongside the transaction window. The active period is the
// same month SEED_LATEST_TRANSACTION_DATE falls in (2026-08), so it's
// still genuinely in progress relative to the sandbox's fixed "as of"
// anchor — a real partial period, not a completed one relabeled "active."
// The month immediately before it is seeded Completed, giving the sandbox
// at least one real historical period and a real refund transaction to
// reconcile against (see ELECTRONICS_JULY below).
const ACTIVE_PERIOD_START = "2026-08-01";
const ACTIVE_PERIOD_END = "2026-08-31";
const COMPLETED_PERIOD_START = "2026-07-01";
const COMPLETED_PERIOD_END = "2026-07-31";

export function budgetPeriodIds(ownerId: string) {
  return {
    active: fixtureId(ownerId, "budget-period:2026-08"),
    completed: fixtureId(ownerId, "budget-period:2026-07"),
  };
}

export function budgetPeriodFixtures(ownerId: string): NewBudgetPeriod[] {
  const ids = budgetPeriodIds(ownerId);
  return [
    {
      id: ids.active,
      ownerId,
      periodStart: ACTIVE_PERIOD_START,
      periodEnd: ACTIVE_PERIOD_END,
      status: "active",
    },
    {
      id: ids.completed,
      ownerId,
      periodStart: COMPLETED_PERIOD_START,
      periodEnd: COMPLETED_PERIOD_END,
      status: "completed",
    },
  ];
}

interface AllocationSeed {
  key: string;
  categoryName: string;
  plannedAmount: string;
}

// Amounts are chosen against the sandbox's own real transaction totals for
// each month (verified by direct query against the seeded data, not
// guessed) so every required scenario is genuinely, not artificially,
// true:
//   - Groceries ($51.56 actual so far): comfortably under, partly because
//     the active period is only a few days in — a real partial-period
//     effect, not a contrived "under" example.
//   - Mortgage Payment ($2,150.00) / Health Insurance ($261.81): near
//     their limit (>95% utilization) without crossing it.
//   - Daycare ($974.67) / Electronics ($249.81): overspent.
//   - Personal & Shopping ($45.00 gym membership, exact): planned equal to
//     actual — the actual > planned overspending boundary, deliberately
//     not tripped.
//   - Auto Loan Payment / Savings Contributions: zero actual spend — the
//     auto loan payment posts on the 5th (SEED_LATEST_TRANSACTION_DATE is
//     the 4th), so this is a real "hasn't happened yet this period" case,
//     not a fabricated empty one. Savings Contributions can only ever be
//     $0 (see categories.ts's comment) — it demonstrates a valid
//     zero-based allocation with no spending against it by construction.
const ACTIVE_ALLOCATIONS: AllocationSeed[] = [
  { key: "mortgage-payment", categoryName: "Mortgage Payment", plannedAmount: "2200.00" },
  { key: "daycare", categoryName: "Daycare", plannedAmount: "900.00" },
  { key: "health-insurance", categoryName: "Health Insurance", plannedAmount: "270.00" },
  { key: "electronics", categoryName: "Electronics", plannedAmount: "150.00" },
  { key: "groceries", categoryName: "Groceries", plannedAmount: "600.00" },
  { key: "restaurants", categoryName: "Restaurants", plannedAmount: "250.00" },
  { key: "clothing", categoryName: "Clothing", plannedAmount: "150.00" },
  { key: "doctor-visits", categoryName: "Doctor Visits", plannedAmount: "100.00" },
  { key: "coffee-shops", categoryName: "Coffee Shops", plannedAmount: "40.00" },
  { key: "personal-shopping", categoryName: "Personal & Shopping", plannedAmount: "45.00" },
  { key: "auto-loan-payment", categoryName: "Auto Loan Payment", plannedAmount: "410.00" },
  { key: "savings-contributions", categoryName: "Savings Contributions", plannedAmount: "300.00" },
];

// July's actuals: Groceries $715.79 (over), Restaurants $349.39 (under),
// Daycare $940.72 (near limit), Fuel $296.19 (over). Electronics is the
// refund case — its only July transaction is a $111.52 income-typed
// refund (no matching purchase landed in July itself), so net actual
// spend is *negative* ($-111.52): computeCategorySpendForPeriod nets
// income against expense per category exactly as it would for a same-
// month purchase-and-refund pair, and a refund-only month is the sharper
// edge case to seed, not a fabricated cleaner one.
const COMPLETED_ALLOCATIONS: AllocationSeed[] = [
  { key: "groceries", categoryName: "Groceries", plannedAmount: "700.00" },
  { key: "restaurants", categoryName: "Restaurants", plannedAmount: "400.00" },
  { key: "electronics", categoryName: "Electronics", plannedAmount: "150.00" },
  { key: "daycare", categoryName: "Daycare", plannedAmount: "950.00" },
  { key: "fuel", categoryName: "Fuel", plannedAmount: "250.00" },
];

function toAllocationRows(
  ownerId: string,
  budgetPeriodId: string,
  periodKey: string,
  seeds: AllocationSeed[],
): NewBudgetAllocation[] {
  const categoryId = categoryIdByName(ownerId);
  return seeds.map((seed, index) => ({
    id: fixtureId(ownerId, `budget-allocation:${periodKey}:${seed.key}`),
    ownerId,
    budgetPeriodId,
    categoryId: categoryId[seed.categoryName],
    plannedAmount: seed.plannedAmount,
    displayOrder: index,
  }));
}

export function budgetAllocationFixtures(ownerId: string): NewBudgetAllocation[] {
  const ids = budgetPeriodIds(ownerId);
  return [
    ...toAllocationRows(ownerId, ids.active, "2026-08", ACTIVE_ALLOCATIONS),
    ...toAllocationRows(ownerId, ids.completed, "2026-07", COMPLETED_ALLOCATIONS),
  ];
}

// Fails fast, at import time, if the sandbox's fixed "as of" anchor
// (window.ts) ever moves outside this file's hardcoded August period —
// the two are meant to stay aligned (see the comment above
// ACTIVE_PERIOD_START), and a silent mismatch would quietly turn "active,
// partial period" into a nonsensical or stale-looking budget instead of a
// loud, obvious failure.
if (
  compareDates(SEED_LATEST_TRANSACTION_DATE, ACTIVE_PERIOD_START) < 0 ||
  compareDates(SEED_LATEST_TRANSACTION_DATE, ACTIVE_PERIOD_END) > 0
) {
  throw new Error(
    `Sandbox budget fixtures assume SEED_LATEST_TRANSACTION_DATE falls within ${ACTIVE_PERIOD_START}..${ACTIVE_PERIOD_END}, but it is ${SEED_LATEST_TRANSACTION_DATE}. Update ACTIVE_PERIOD_START/END in fixtures/budgets.ts to match.`,
  );
}
