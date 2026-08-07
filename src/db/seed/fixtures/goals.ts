import type { NewGoal, NewGoalContribution } from "../../schema";
import { compareDates, fixtureId } from "../deterministic";
import { accountIds } from "./accounts";
import { categoryIdByName } from "./categories";
import { SEED_LATEST_TRANSACTION_DATE } from "./window";

// Eight goals covering the scenarios the Goals sandbox is required to
// demonstrate: a steady, overfunded-via-allocation, high-priority goal
// (Emergency Fund), a goal just getting started (Vacation Fund), a
// high-priority goal that has fallen behind its own pace and draws from
// two accounts (House Down Payment), a goal that's nearly funded by manual
// contributions alone (Roth IRA Contribution), a goal that's already done
// (Debt Payoff), a goal funded entirely by a CD allocation with an exact
// full allocation (College Fund — see fixtures/goal-allocations.ts), a
// high-priority goal with no other urgent signal so it surfaces as an
// Upcoming Objective purely on its priority tag (Wedding Fund), and a
// Paused goal whose contributions remain untouched but which generates no
// objective and doesn't count toward active-goal metrics (Home Renovation
// Fund). Dates are fixed ISO literals, never `new Date()` — see
// deterministic.ts. Health is computed live by goal-calculations.ts
// against the real clock at request time (not frozen at seed time), so
// these scenarios hold as long as "now" stays within a few weeks of when
// this file was written — the margins below are chosen wide enough (>15
// points) to tolerate that drift without flipping category. The
// "approaching target date" Upcoming Objective rule is deliberately NOT
// exercised by a permanent sandbox fixture — a fixed date can only stay
// within a 60-day window of "now" for a couple of months before drifting
// out, unlike the health thresholds' much wider tolerance — so that rule
// is covered by goal-calculations.test.ts's fixtures instead.
export interface GoalIds {
  emergencyFund: string;
  vacationFund: string;
  houseDownPayment: string;
  rothIraContribution: string;
  debtPayoff: string;
  collegeFund: string;
  weddingFund: string;
  homeRenovationFund: string;
}

export function goalIds(ownerId: string): GoalIds {
  return {
    emergencyFund: fixtureId(ownerId, "goal:emergency-fund"),
    vacationFund: fixtureId(ownerId, "goal:vacation-fund"),
    houseDownPayment: fixtureId(ownerId, "goal:house-down-payment"),
    rothIraContribution: fixtureId(ownerId, "goal:roth-ira-contribution"),
    debtPayoff: fixtureId(ownerId, "goal:debt-payoff"),
    collegeFund: fixtureId(ownerId, "goal:college-fund"),
    weddingFund: fixtureId(ownerId, "goal:wedding-fund"),
    homeRenovationFund: fixtureId(ownerId, "goal:home-renovation-fund"),
  };
}

export function goalFixtures(ownerId: string): NewGoal[] {
  const ids = goalIds(ownerId);
  const accounts = accountIds(ownerId);
  const categoryId = categoryIdByName(ownerId);

  return [
    // Overfunded via a mix of manual contributions (72%, see
    // EMERGENCY_FUND_CONTRIBUTIONS) plus a goal_allocations claim against
    // this same account (see fixtures/goal-allocations.ts) — the two
    // ledgers sum past 100% without either one alone reaching it,
    // demonstrating both "no double counting" (they're additive, not
    // overlapping) and honest overfunding.
    {
      id: ids.emergencyFund,
      ownerId,
      accountId: accounts.emergencySavings,
      title: "Emergency Fund",
      description: "Three to six months of essential expenses, held in cash.",
      targetAmount: "20000.00",
      targetDate: "2027-02-07",
      goalType: "emergency-fund",
      status: "active",
      priority: "high",
      color: "#22c55e",
      displayOrder: 0,
      createdAt: new Date("2025-08-07T00:00:00Z"),
    },
    // New goal — created two weeks ago, one small contribution so far.
    {
      id: ids.vacationFund,
      ownerId,
      title: "Vacation Fund",
      description: "A week in the mountains next summer.",
      targetAmount: "5000.00",
      targetDate: "2027-01-25",
      goalType: "vacation",
      status: "active",
      priority: "low",
      color: "#3b82f6",
      displayOrder: 1,
      createdAt: new Date("2026-07-25T00:00:00Z"),
    },
    // Behind goal, funded from two different accounts (see
    // fixtures/goal-allocations.ts's "one goal, multiple accounts"
    // allocations) plus manual contributions — still meaningfully behind
    // its own pace even after the added allocations.
    {
      id: ids.houseDownPayment,
      ownerId,
      accountId: accounts.householdSavings,
      title: "House Down Payment",
      description: "20% down payment on a first home.",
      targetAmount: "60000.00",
      targetDate: "2026-11-07",
      goalType: "home",
      status: "active",
      priority: "high",
      color: "#f97316",
      displayOrder: 2,
      createdAt: new Date("2024-12-01T00:00:00Z"),
    },
    // Nearly complete — funded to 92% with only ~59% of the tax year
    // elapsed, i.e. ahead of pace as well as close to done.
    {
      id: ids.rothIraContribution,
      ownerId,
      accountId: accounts.rothIra,
      title: "Roth IRA Contribution",
      description: "Max out this year's Roth IRA contribution.",
      targetAmount: "7000.00",
      targetDate: "2026-12-31",
      goalType: "retirement",
      status: "active",
      priority: "medium",
      color: "#a855f7",
      displayOrder: 3,
      createdAt: new Date("2026-01-05T00:00:00Z"),
    },
    // Already completed — fully funded and explicitly marked completed
    // ahead of its own target date.
    {
      id: ids.debtPayoff,
      ownerId,
      categoryId: categoryId["Credit Card Interest"],
      title: "Debt Payoff",
      description: "Pay off the remaining credit card balance.",
      targetAmount: "12450.00",
      targetDate: "2026-06-15",
      goalType: "debt-payoff",
      status: "completed",
      priority: "medium",
      color: "#ec4899",
      displayOrder: 4,
      createdAt: new Date("2025-01-15T00:00:00Z"),
      completedAt: new Date("2026-03-25T00:00:00Z"),
    },
    // CD-funded, allocation-only (no manual contributions at all) — the
    // exact-full-allocation scenario: its entire target is allocated from
    // the 12-Month CD in one allocation (see fixtures/goal-allocations.ts).
    // No account/category reference-link hint here (unlike the others
    // above) — its funding relationship is expressed entirely through the
    // allocation ledger, demonstrating that the inert accountId hint is
    // optional and unrelated to actual funding.
    {
      id: ids.collegeFund,
      ownerId,
      title: "College Fund",
      description: "Future education costs, funded by a maturing CD.",
      targetAmount: "8000.00",
      targetDate: "2030-08-01",
      goalType: "education",
      status: "active",
      priority: "medium",
      color: "#eab308",
      displayOrder: 5,
      createdAt: new Date("2026-08-01T00:00:00Z"),
    },
    // High priority, but neither near-completion nor behind pace (no
    // targetDate at all, so health falls back to the flat-threshold rule;
    // 40% lands solidly in the on-track 25-75% band) — the one goal in
    // this sandbox whose Upcoming Objective, if any, can only come from
    // its priority tag, not from urgency.
    {
      id: ids.weddingFund,
      ownerId,
      title: "Wedding Fund",
      description: "Venue, catering, and everything else.",
      targetAmount: "15000.00",
      goalType: "custom",
      status: "active",
      priority: "high",
      color: "#ec4899",
      displayOrder: 6,
      createdAt: new Date("2026-02-01T00:00:00Z"),
    },
    // Paused — deliberately stopped funding for now. Contributions already
    // made are left exactly as they were; no new ones are accepted while
    // paused (GoalService.FUNDABLE_STATUSES), it generates no Upcoming
    // Objective regardless of how far behind or close to its target it
    // looks, and it doesn't count toward the "On Track" active-goal
    // summary metric — only toward the overall Total Goals/Total Saved
    // totals, same as every non-archived goal.
    {
      id: ids.homeRenovationFund,
      ownerId,
      title: "Home Renovation Fund",
      description: "Kitchen and bathroom updates — on hold for now.",
      targetAmount: "10000.00",
      goalType: "home",
      status: "paused",
      priority: "low",
      color: "#6b7280",
      displayOrder: 7,
      createdAt: new Date("2025-11-01T00:00:00Z"),
    },
  ];
}

interface ContributionSeed {
  key: string;
  amount: string;
  contributionDate: string;
  note?: string;
}

const EMERGENCY_FUND_CONTRIBUTIONS: ContributionSeed[] = [
  { key: "1", amount: "5000.00", contributionDate: "2025-08-10", note: "Initial deposit" },
  { key: "2", amount: "940.00", contributionDate: "2025-09-10" },
  { key: "3", amount: "940.00", contributionDate: "2025-10-10" },
  { key: "4", amount: "940.00", contributionDate: "2025-11-10" },
  { key: "5", amount: "940.00", contributionDate: "2025-12-10" },
  { key: "6", amount: "940.00", contributionDate: "2026-01-10" },
  { key: "7", amount: "940.00", contributionDate: "2026-02-10" },
  { key: "8", amount: "940.00", contributionDate: "2026-03-10" },
  { key: "9", amount: "940.00", contributionDate: "2026-04-10" },
  { key: "10", amount: "940.00", contributionDate: "2026-05-10" },
  { key: "11", amount: "940.00", contributionDate: "2026-06-10" },
];

const VACATION_FUND_CONTRIBUTIONS: ContributionSeed[] = [
  { key: "1", amount: "250.00", contributionDate: "2026-07-28", note: "First deposit" },
];

const HOUSE_DOWN_PAYMENT_CONTRIBUTIONS: ContributionSeed[] = Array.from({ length: 20 }, (_, index) => {
  const date = new Date(Date.UTC(2024, 11 + index, 7));
  return {
    key: String(index + 1),
    amount: "1200.00",
    contributionDate: date.toISOString().slice(0, 10),
  };
});

const ROTH_IRA_CONTRIBUTIONS: ContributionSeed[] = [
  { key: "1", amount: "1000.00", contributionDate: "2026-01-10" },
  { key: "2", amount: "1000.00", contributionDate: "2026-02-10" },
  { key: "3", amount: "1000.00", contributionDate: "2026-03-10" },
  { key: "4", amount: "1000.00", contributionDate: "2026-04-10" },
  { key: "5", amount: "1000.00", contributionDate: "2026-05-10" },
  { key: "6", amount: "1000.00", contributionDate: "2026-06-10" },
  { key: "7", amount: "440.00", contributionDate: "2026-07-10" },
];

const DEBT_PAYOFF_CONTRIBUTIONS: ContributionSeed[] = Array.from({ length: 15 }, (_, index) => {
  const date = new Date(Date.UTC(2025, index, 20));
  return {
    key: String(index + 1),
    amount: "830.00",
    contributionDate: date.toISOString().slice(0, 10),
  };
});

const WEDDING_FUND_CONTRIBUTIONS: ContributionSeed[] = [
  { key: "1", amount: "1000.00", contributionDate: "2026-02-15" },
  { key: "2", amount: "1000.00", contributionDate: "2026-03-15" },
  { key: "3", amount: "1000.00", contributionDate: "2026-04-15" },
  { key: "4", amount: "1000.00", contributionDate: "2026-05-15" },
  { key: "5", amount: "1000.00", contributionDate: "2026-06-15" },
  { key: "6", amount: "1000.00", contributionDate: "2026-07-15" },
];

// Both contributions predate the pause — this goal's funding history is
// frozen exactly where it was left, which is the point of the fixture.
const HOME_RENOVATION_FUND_CONTRIBUTIONS: ContributionSeed[] = [
  { key: "1", amount: "1200.00", contributionDate: "2025-11-10", note: "Initial deposit" },
  { key: "2", amount: "800.00", contributionDate: "2025-12-10" },
];

function toContributionRows(
  ownerId: string,
  goalId: string,
  goalKey: string,
  seeds: ContributionSeed[],
): NewGoalContribution[] {
  return seeds.map((seed) => ({
    id: fixtureId(ownerId, `goal-contribution:${goalKey}:${seed.key}`),
    ownerId,
    goalId,
    amount: seed.amount,
    contributionDate: seed.contributionDate,
    note: seed.note ?? null,
    source: "manual",
  }));
}

export function goalContributionFixtures(ownerId: string): NewGoalContribution[] {
  const ids = goalIds(ownerId);
  return [
    ...toContributionRows(ownerId, ids.emergencyFund, "emergency-fund", EMERGENCY_FUND_CONTRIBUTIONS),
    ...toContributionRows(ownerId, ids.vacationFund, "vacation-fund", VACATION_FUND_CONTRIBUTIONS),
    ...toContributionRows(ownerId, ids.houseDownPayment, "house-down-payment", HOUSE_DOWN_PAYMENT_CONTRIBUTIONS),
    ...toContributionRows(ownerId, ids.rothIraContribution, "roth-ira-contribution", ROTH_IRA_CONTRIBUTIONS),
    ...toContributionRows(ownerId, ids.debtPayoff, "debt-payoff", DEBT_PAYOFF_CONTRIBUTIONS),
    ...toContributionRows(ownerId, ids.weddingFund, "wedding-fund", WEDDING_FUND_CONTRIBUTIONS),
    ...toContributionRows(ownerId, ids.homeRenovationFund, "home-renovation-fund", HOME_RENOVATION_FUND_CONTRIBUTIONS),
  ];
}

// Fails fast, at import time, if every seeded contribution date isn't
// safely within the sandbox's transaction window — a future-dated
// contribution would misrepresent this as "already happened" activity,
// the same fail-fast posture fixtures/budgets.ts uses for its period
// dates. Checked against the raw (owner-independent) seed arrays, since
// contributionDate never varies by owner.
const ALL_CONTRIBUTION_SEEDS = [
  ...EMERGENCY_FUND_CONTRIBUTIONS,
  ...VACATION_FUND_CONTRIBUTIONS,
  ...HOUSE_DOWN_PAYMENT_CONTRIBUTIONS,
  ...ROTH_IRA_CONTRIBUTIONS,
  ...DEBT_PAYOFF_CONTRIBUTIONS,
  ...WEDDING_FUND_CONTRIBUTIONS,
  ...HOME_RENOVATION_FUND_CONTRIBUTIONS,
];

for (const seed of ALL_CONTRIBUTION_SEEDS) {
  if (compareDates(seed.contributionDate, SEED_LATEST_TRANSACTION_DATE) > 0) {
    throw new Error(
      `Sandbox goal fixtures contain a contribution dated ${seed.contributionDate}, after SEED_LATEST_TRANSACTION_DATE (${SEED_LATEST_TRANSACTION_DATE}).`,
    );
  }
}
