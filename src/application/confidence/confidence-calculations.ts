import { getAccountPresentation } from "@/application/dashboard/account-presentation";
import type { GoalProgress } from "@/application/goals/goal-calculations";
import type { NetWorthOverviewView } from "@/application/net-worth/net-worth-views";
import { computeSpendingSummary } from "@/application/transactions/spending-aggregation";
import type { Account } from "@/domains/accounts/types";
import type { Transaction } from "@/domains/transactions/types";

// Pure calculation layer — no repository/DB dependency, trivially
// unit-testable with plain fixtures, same convention as budget-
// calculations.ts / goal-calculations.ts / net-worth-breakdown.ts. This is
// the ONE canonical Confidence calculation path; nothing outside this file
// (and confidence-history-calculations.ts, its trend-comparison sibling)
// computes a Confidence Score or pillar score.
//
// Authoritative source: docs/products/confidence-engine.md — the 8
// pillars, their exact weights, and the 6 score bands below are taken
// verbatim from that spec, not invented. What the spec does NOT define
// (confirmed absent from docs/financial-model/, docs/architecture/
// domain-model.md, and docs/intelligence/*): a formula for turning each
// pillar's qualitative "Measures" into a 0-100 number, a missing-data
// policy, or a trend/attribution rule. Those gaps were reported to the
// user before implementation; the resolutions below reflect that
// conversation, not a unilateral invention:
//   - Missing-data policy (explicit user decision): a pillar/signal with
//     no knowable data for this owner is EXCLUDED, never scored 0 or a
//     fabricated neutral 50 — the overall score is a weighted average of
//     only the AVAILABLE pillars, with their spec weights renormalized to
//     sum to 100%. Every signal — available or not — still emits a
//     reason code, so "what wasn't measured and why" is always visible
//     (confidence-engine.md: "Transparency over Mystery").
//   - Sub-formulas: every signal below is built exclusively from
//     canonical calculations this codebase already has (computeNetWorth
//     Breakdown/History, computeBudgetPeriodTotals, computeGoalProgress,
//     computeSpendingSummary) — never a second, parallel computation of
//     the same financial facts. The specific curves mapping a real ratio
//     to a 0-100 score (e.g. "6 months of expenses = full Resilience
//     credit") are new, since no such mapping exists anywhere in this
//     codebase or its docs; each is documented at its definition.
//   - Product-scope gaps: several named Measures (insurance coverage,
//     portfolio diversification, employer match, bills-paid-on-time,
//     weekly reviews, mission engagement, mission completion) have no
//     backing domain in this codebase at all. These are never estimated
//     or approximated — each emits a permanent, always-unavailable
//     "NOT_MEASURED_V1" signal (zero weight, purely informational) so a
//     user can see exactly what this version does not yet evaluate,
//     rather than silently omitting them.

export const PILLAR_IDS = [
  "cashFlow",
  "resilience",
  "debtHealth",
  "savings",
  "investing",
  "retirement",
  "financialHabits",
  "progressTrajectory",
] as const;
export type ConfidencePillarId = (typeof PILLAR_IDS)[number];

// confidence-engine.md's "The Eight Dimensions of Financial Confidence" —
// exact weights, sums to 1.
export const PILLAR_WEIGHTS: Record<ConfidencePillarId, number> = {
  cashFlow: 0.2,
  resilience: 0.2,
  debtHealth: 0.15,
  savings: 0.1,
  investing: 0.1,
  retirement: 0.1,
  financialHabits: 0.1,
  progressTrajectory: 0.05,
};

export const PILLAR_LABELS: Record<ConfidencePillarId, string> = {
  cashFlow: "Cash Flow",
  resilience: "Resilience",
  debtHealth: "Debt Health",
  savings: "Savings",
  investing: "Investing",
  retirement: "Retirement",
  financialHabits: "Financial Habits",
  progressTrajectory: "Progress & Trajectory",
};

// confidence-engine.md's "Confidence Levels" table, verbatim.
export const CONFIDENCE_BANDS = [
  { id: "exceptional", label: "Exceptional", min: 95, max: 100 },
  { id: "strong", label: "Strong", min: 85, max: 94 },
  { id: "stable", label: "Stable", min: 70, max: 84 },
  { id: "building", label: "Building", min: 55, max: 69 },
  { id: "vulnerable", label: "Vulnerable", min: 40, max: 54 },
  { id: "atRisk", label: "At Risk", min: 0, max: 39 },
] as const;
export type ConfidenceBandId = (typeof CONFIDENCE_BANDS)[number]["id"];

export function bandForScore(score: number): { id: ConfidenceBandId; label: string } {
  const clamped = clamp(score, 0, 100);
  const band = CONFIDENCE_BANDS.find((b) => clamped >= b.min && clamped <= b.max) ?? CONFIDENCE_BANDS[CONFIDENCE_BANDS.length - 1];
  return { id: band.id, label: band.label };
}

export type SignalPolarity = "positive" | "negative" | "neutral" | "unavailable";

export interface ConfidenceSignal {
  // Stable machine id, e.g. "cash-flow.net-cash-flow" — never renamed once
  // shipped; reason-code/signal ids are a public contract for anything
  // that ever consumes them (tests, future UI, future exports).
  id: string;
  pillar: ConfidencePillarId;
  label: string;
  status: "available" | "unavailable";
  // 0-100, or null when status is "unavailable".
  score: number | null;
  polarity: SignalPolarity;
  // Stable, upper-snake-case reason code — the machine-readable half of
  // explainability; `message` is the human-readable half.
  reasonCode: string;
  message: string;
}

export interface ConfidencePillarResult {
  id: ConfidencePillarId;
  label: string;
  // The spec weight (e.g. 0.20) — never changes based on availability.
  weight: number;
  status: "available" | "unavailable";
  // Average of this pillar's available signals' scores, or null if none
  // are available.
  score: number | null;
  // weight / (sum of available pillars' weights), or 0 if this pillar is
  // unavailable — the renormalized weight actually used in the overall
  // average. Exposed directly so "weighting" is independently assertable
  // in tests without re-deriving it from the overall score.
  effectiveWeight: number;
  signals: ConfidenceSignal[];
}

export interface ConfidenceResult {
  asOf: Date;
  // Null only when every pillar is unavailable (e.g. a brand-new owner
  // with no accounts, transactions, goals, or budget) — an honest "not
  // enough data yet" state, never a fabricated default score.
  overallScore: number | null;
  band: { id: ConfidenceBandId; label: string } | null;
  pillars: ConfidencePillarResult[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function unavailableSignal(
  id: string,
  pillar: ConfidencePillarId,
  label: string,
  reasonCode: string,
  message: string,
): ConfidenceSignal {
  return { id, pillar, label, status: "unavailable", score: null, polarity: "unavailable", reasonCode, message };
}

// A measure named in confidence-engine.md that this version genuinely
// cannot compute at all (no backing domain exists), as opposed to a
// per-owner missing-data case. Always unavailable, for every owner, until
// the backing domain exists — see this file's module comment.
function productScopeGapSignal(id: string, pillar: ConfidencePillarId, label: string, note: string): ConfidenceSignal {
  return unavailableSignal(id, pillar, label, "NOT_MEASURED_V1", `Not measured in this version: ${note}`);
}

// ---- Inputs -----------------------------------------------------------

export interface ConfidenceCalculationInputs {
  asOf: Date;
  // Active accounts only — the same population computeNetWorthBreakdown
  // and getNetWorthOverview use.
  activeAccounts: Account[];
  // Trailing 30-day transactions (non-excluded) — same window
  // DashboardService's own default periodDays=30 convention already uses.
  transactions30d: Transaction[];
  // Trailing 90-day transactions — a longer, more stable window for
  // Resilience's "typical monthly expense" baseline and Financial
  // Habits' categorization rate.
  transactions90d: Transaction[];
  // The owner's active budget period's totals, or null if none exists.
  activeBudgetTotals: { totalBudgeted: number; totalSpent: number; overallProgress: number } | null;
  // Every non-deleted goal's real progress — never pre-filtered by the
  // caller; each signal below filters what it needs.
  goalProgressList: GoalProgress[];
  // The exact same canonical Net Worth view the Net Worth page and
  // Dashboard already render (see net-worth-query.ts's
  // getNetWorthOverview) — read only, never recomputed.
  netWorth: NetWorthOverviewView;
}

// ---- Cash Flow (20%) ----------------------------------------------------
// Measures covered: "Positive monthly cash flow" (net-cash-flow signal),
// "Budget adherence" (budget-adherence signal). "Income stability" and
// "Spending consistency" would need multi-period income/spending variance
// this codebase doesn't track (only a single trailing window) — not
// modeled in V1, no gap signal emitted for these two since Cash Flow
// already has two real, available-by-default signals; see the module
// comment's product-scope-gap policy, which applies to pillars that would
// otherwise have NO real signal at all.

function computeCashFlowSignals(inputs: ConfidenceCalculationInputs): ConfidenceSignal[] {
  const signals: ConfidenceSignal[] = [];
  const summary = computeSpendingSummary(inputs.transactions30d);

  if (summary.income === 0 && summary.expenses === 0) {
    signals.push(
      unavailableSignal(
        "cash-flow.net-cash-flow",
        "cashFlow",
        "Net Cash Flow",
        "NO_TRANSACTIONS",
        "No transactions recorded in the last 30 days.",
      ),
    );
  } else if (summary.income === 0) {
    signals.push({
      id: "cash-flow.net-cash-flow",
      pillar: "cashFlow",
      label: "Net Cash Flow",
      status: "available",
      score: 0,
      polarity: "negative",
      reasonCode: "SPENDING_WITHOUT_INCOME",
      message: `${formatCurrency(summary.expenses)} in expenses over the last 30 days with no recorded income.`,
    });
  } else {
    // Centered at 50 (break-even): saving 25% of income -> 75, overspending
    // by 25% of income -> 25. Same "centered-at-50" shape used by every
    // other trend-style signal in this file, for one consistent curve
    // language across the whole Confidence Engine.
    const ratio = summary.net / summary.income;
    const score = clamp(50 + ratio * 100, 0, 100);
    signals.push({
      id: "cash-flow.net-cash-flow",
      pillar: "cashFlow",
      label: "Net Cash Flow",
      status: "available",
      score,
      polarity: ratio > 0.02 ? "positive" : ratio < -0.02 ? "negative" : "neutral",
      reasonCode: ratio >= 0 ? "POSITIVE_CASH_FLOW" : "NEGATIVE_CASH_FLOW",
      message: `Net cash flow was ${formatCurrency(summary.net)} over the last 30 days (${formatPercent(ratio * 100)} of income).`,
    });
  }

  if (inputs.activeBudgetTotals === null) {
    signals.push(
      unavailableSignal(
        "cash-flow.budget-adherence",
        "cashFlow",
        "Budget Adherence",
        "NO_ACTIVE_BUDGET",
        "No active budget period to measure adherence against.",
      ),
    );
  } else {
    // 100% utilization (spent exactly what was planned) -> full 100;
    // every point over 100% utilization costs one point, floor 0.
    const utilization = inputs.activeBudgetTotals.overallProgress;
    const score = clamp(200 - utilization, 0, 100);
    signals.push({
      id: "cash-flow.budget-adherence",
      pillar: "cashFlow",
      label: "Budget Adherence",
      status: "available",
      score,
      polarity: utilization <= 100 ? "positive" : "negative",
      reasonCode: utilization <= 100 ? "WITHIN_BUDGET" : "OVER_BUDGET",
      message: `${formatPercent(utilization)} of your planned budget spent this period.`,
    });
  }

  return signals;
}

// ---- Resilience (20%) ---------------------------------------------------
// Measures covered: "Emergency fund", "Financial runway", "Liquid assets"
// (all three collapse into one real, derivable signal: months of
// liquid-account balance relative to average monthly expenses — the
// standard personal-finance "emergency fund" heuristic). "Insurance
// coverage" has no backing domain — permanent gap signal.

const LIQUID_GROUPS = new Set(["Cash"]);
// The standard personal-finance "fully funded emergency fund" heuristic
// (3-6 months of expenses; this uses the higher end) — not stated in
// confidence-engine.md, chosen because no threshold is specified there and
// this is the most widely recognized benchmark for the same measure the
// spec names ("Emergency fund", "Financial runway").
const FULLY_FUNDED_RUNWAY_MONTHS = 6;

function computeResilienceSignals(inputs: ConfidenceCalculationInputs): ConfidenceSignal[] {
  const liquidBalance = inputs.activeAccounts
    .filter((account) => LIQUID_GROUPS.has(getAccountPresentation(account.accountType).group))
    .reduce((sum, account) => sum + (account.currentBalance ? Number(account.currentBalance) : 0), 0);

  const summary90 = computeSpendingSummary(inputs.transactions90d);
  const avgMonthlyExpenses = summary90.expenses / 3;

  const signals: ConfidenceSignal[] = [];
  if (avgMonthlyExpenses <= 0) {
    signals.push(
      unavailableSignal(
        "resilience.emergency-runway",
        "resilience",
        "Emergency Fund Runway",
        "NO_EXPENSE_HISTORY",
        "No expense history in the last 90 days to measure runway against.",
      ),
    );
  } else {
    const runwayMonths = liquidBalance / avgMonthlyExpenses;
    const score = clamp((runwayMonths / FULLY_FUNDED_RUNWAY_MONTHS) * 100, 0, 100);
    signals.push({
      id: "resilience.emergency-runway",
      pillar: "resilience",
      label: "Emergency Fund Runway",
      status: "available",
      score,
      polarity: runwayMonths >= 3 ? "positive" : runwayMonths >= 1 ? "neutral" : "negative",
      reasonCode: runwayMonths >= FULLY_FUNDED_RUNWAY_MONTHS ? "STRONG_RUNWAY" : runwayMonths >= 3 ? "MODERATE_RUNWAY" : "LOW_RUNWAY",
      message: `Liquid balance covers about ${runwayMonths.toFixed(1)} months of average expenses (target: ${FULLY_FUNDED_RUNWAY_MONTHS} months).`,
    });
  }

  signals.push(
    productScopeGapSignal("resilience.insurance-coverage", "resilience", "Insurance Coverage", "no insurance domain exists yet."),
  );

  return signals;
}

// ---- Debt Health (15%) --------------------------------------------------
// Measures covered: a balance-sheet debt load (substituting for the
// spec's "Debt-to-income ratio" — no debt-payment-vs-income signal is
// reliably derivable from Transactions without inventing transaction-
// categorization heuristics this codebase doesn't have; the liability-to-
// asset ratio uses the same canonical Net Worth totals instead) and "Debt
// payoff progress" (the liability trend signal, from real Net Worth
// History). "Credit utilization" and "High-interest debt" would need
// per-account credit-limit/APR data this schema doesn't store — not
// modeled.

function computeDebtHealthSignals(inputs: ConfidenceCalculationInputs): ConfidenceSignal[] {
  const { netWorth } = inputs;
  const signals: ConfidenceSignal[] = [];

  if (netWorth.totalAssets === 0 && netWorth.totalLiabilities === 0) {
    signals.push(
      unavailableSignal(
        "debt-health.liability-ratio",
        "debtHealth",
        "Liability Ratio",
        "NO_ACCOUNTS",
        "No accounts to measure debt against.",
      ),
    );
  } else {
    const ratio = netWorth.totalAssets > 0 ? netWorth.totalLiabilities / netWorth.totalAssets : netWorth.totalLiabilities > 0 ? 1 : 0;
    const score = clamp(100 - ratio * 100, 0, 100);
    signals.push({
      id: "debt-health.liability-ratio",
      pillar: "debtHealth",
      label: "Liability Ratio",
      status: "available",
      score,
      polarity: ratio <= 0.3 ? "positive" : ratio <= 0.6 ? "neutral" : "negative",
      reasonCode: ratio <= 0.3 ? "LOW_LIABILITY_RATIO" : ratio <= 0.6 ? "MODERATE_LIABILITY_RATIO" : "HIGH_LIABILITY_RATIO",
      message: `Total liabilities are ${formatPercent(ratio * 100)} of total assets.`,
    });
  }

  const liabilitiesChange = netWorth.totalLiabilitiesChange;
  if (!netWorth.hasHistory || !liabilitiesChange || liabilitiesChange.percentChange === null) {
    signals.push(
      unavailableSignal(
        "debt-health.trend",
        "debtHealth",
        "Debt Trend",
        "NO_HISTORY",
        "No historical snapshot yet to measure a debt trend.",
      ),
    );
  } else {
    const pct = liabilitiesChange.percentChange;
    const score = clamp(50 - pct * 2, 0, 100);
    signals.push({
      id: "debt-health.trend",
      pillar: "debtHealth",
      label: "Debt Trend",
      status: "available",
      score,
      polarity: pct < 0 ? "positive" : pct > 0 ? "negative" : "neutral",
      reasonCode: pct < 0 ? "LIABILITIES_DECREASING" : pct > 0 ? "LIABILITIES_INCREASING" : "LIABILITIES_FLAT",
      message: `Total liabilities have ${pct < 0 ? "decreased" : pct > 0 ? "increased" : "stayed flat"} ${formatPercent(Math.abs(pct))} since ${liabilitiesChange.comparisonDate}.`,
    });
  }

  return signals;
}

// ---- Savings (10%) -------------------------------------------------------
// Measures covered: "Goal funding" (emergency-fund/general-savings goal
// progress, via the canonical computeGoalProgress) and "Emergency savings"
// (the savings-account balance trend, via real Net Worth History).
// "Savings rate" is deliberately NOT duplicated here — that ratio is
// already Cash Flow's net-cash-flow signal; reusing the identical number
// under a second pillar would inflate its influence on the overall score
// without adding new information.

const SAVINGS_GOAL_TYPES = new Set(["emergency-fund", "general-savings"]);

function computeSavingsSignals(inputs: ConfidenceCalculationInputs): ConfidenceSignal[] {
  const signals: ConfidenceSignal[] = [];

  const savingsGoals = inputs.goalProgressList.filter(
    (progress) => SAVINGS_GOAL_TYPES.has(progress.goal.goalType) && progress.goal.status !== "archived",
  );
  if (savingsGoals.length === 0) {
    signals.push(
      unavailableSignal(
        "savings.goal-funding",
        "savings",
        "Savings Goal Funding",
        "NO_SAVINGS_GOALS",
        "No emergency-fund or general-savings goals set yet.",
      ),
    );
  } else {
    const average =
      savingsGoals.reduce((sum, progress) => sum + clamp(progress.percentComplete, 0, 100), 0) / savingsGoals.length;
    signals.push({
      id: "savings.goal-funding",
      pillar: "savings",
      label: "Savings Goal Funding",
      status: "available",
      score: average,
      polarity: average >= 75 ? "positive" : average >= 25 ? "neutral" : "negative",
      reasonCode: average >= 75 ? "SAVINGS_GOALS_WELL_FUNDED" : average >= 25 ? "SAVINGS_GOALS_PARTIALLY_FUNDED" : "SAVINGS_GOALS_UNDERFUNDED",
      message: `Savings-related goals are ${formatPercent(average)} funded on average.`,
    });
  }

  const savingsChange = inputs.netWorth.assetCategoryChanges.find((change) => change.accountType === "savings");
  if (!inputs.netWorth.hasHistory || !savingsChange) {
    signals.push(
      unavailableSignal(
        "savings.balance-trend",
        "savings",
        "Savings Balance Trend",
        "NO_HISTORY",
        "No savings-account history yet to measure a trend.",
      ),
    );
  } else {
    const pct = percentChangeFor(savingsChange);
    const score = clamp(50 + pct, 0, 100);
    signals.push({
      id: "savings.balance-trend",
      pillar: "savings",
      label: "Savings Balance Trend",
      status: "available",
      score,
      polarity: pct > 0 ? "positive" : pct < 0 ? "negative" : "neutral",
      reasonCode: pct > 0 ? "SAVINGS_GROWING" : pct < 0 ? "SAVINGS_SHRINKING" : "SAVINGS_FLAT",
      message: `Savings account balances have ${pct >= 0 ? "grown" : "declined"} ${formatPercent(Math.abs(pct))} since your last snapshot.`,
    });
  }

  return signals;
}

// ---- Investing (10%) / Retirement (10%) ----------------------------------
// Measures covered: mere participation ("do you hold any accounts of this
// type") and the account-type balance trend (via real Net Worth History
// category changes). "Portfolio diversification", "Employer match
// utilization", and "Retirement projection" have no backing domain — no
// contribution-vs-appreciation split, no holdings/allocation data, no
// employer-match tracking exist anywhere in this schema.

interface AssetTypeChange {
  accountType: string;
  comparisonAmount: number;
  absoluteChange: number;
}

function percentChangeFor(change: AssetTypeChange): number {
  return change.comparisonAmount > 0 ? (change.absoluteChange / change.comparisonAmount) * 100 : change.absoluteChange > 0 ? 100 : 0;
}

function computeHoldingsTrendSignal(
  inputs: ConfidenceCalculationInputs,
  accountType: "investment" | "retirement",
  pillar: ConfidencePillarId,
  label: string,
): ConfidenceSignal {
  const id = `${pillar}.holdings-trend`;

  // A brand-new owner with zero accounts of ANY kind hasn't had a chance
  // to demonstrate investing behavior one way or the other yet — treating
  // that as a real "you have no investments" signal would score every new
  // owner as an instant failure on this pillar before they've done
  // anything. Only once the owner has SOME real account engagement does
  // "no accounts of this specific type" become a genuine, informative
  // fact worth scoring (as opposed to missing data).
  if (inputs.activeAccounts.length === 0) {
    return unavailableSignal(id, pillar, label, "NO_ACCOUNTS_AT_ALL", "No accounts linked yet.");
  }

  const holds = inputs.activeAccounts.some(
    (account) => account.accountType === accountType && account.currentBalance !== null && Number(account.currentBalance) > 0,
  );

  if (!holds) {
    // A real, known fact (not missing data) — framed as an opportunity per
    // confidence-engine.md's "Coaching over Judgment" principle, never as
    // a criticism.
    return {
      id,
      pillar,
      label,
      status: "available",
      score: 0,
      polarity: "negative",
      reasonCode: "NO_ACCOUNTS_OF_TYPE",
      message: `No ${accountType} accounts yet — this is one of the highest-impact ways to build long-term confidence.`,
    };
  }

  const change = inputs.netWorth.assetCategoryChanges.find((c) => c.accountType === accountType);
  if (!inputs.netWorth.hasHistory || !change) {
    return {
      id,
      pillar,
      label,
      status: "available",
      score: 60,
      polarity: "neutral",
      reasonCode: "HOLDINGS_PRESENT_NO_TREND_YET",
      message: `You hold ${accountType} accounts; trend data will be available after your first historical snapshot.`,
    };
  }

  const pct = percentChangeFor(change);
  const score = clamp(50 + pct, 0, 100);
  return {
    id,
    pillar,
    label,
    status: "available",
    score,
    polarity: pct > 0 ? "positive" : pct < 0 ? "negative" : "neutral",
    reasonCode: pct > 0 ? "BALANCE_GROWING" : pct < 0 ? "BALANCE_SHRINKING" : "BALANCE_FLAT",
    message: `${label} balance has ${pct >= 0 ? "grown" : "declined"} ${formatPercent(Math.abs(pct))} since your last snapshot.`,
  };
}

function computeInvestingSignals(inputs: ConfidenceCalculationInputs): ConfidenceSignal[] {
  return [
    computeHoldingsTrendSignal(inputs, "investment", "investing", "Investment Holdings"),
    productScopeGapSignal("investing.diversification", "investing", "Portfolio Diversification", "no holdings/allocation data exists yet."),
  ];
}

function computeRetirementSignals(inputs: ConfidenceCalculationInputs): ConfidenceSignal[] {
  return [
    computeHoldingsTrendSignal(inputs, "retirement", "retirement", "Retirement Holdings"),
    productScopeGapSignal("retirement.employer-match", "retirement", "Employer Match Utilization", "no employer-match tracking exists yet."),
    productScopeGapSignal("retirement.projection", "retirement", "Retirement Projection", "no retirement projection model exists yet."),
  ];
}

// ---- Financial Habits (10%) ----------------------------------------------
// Measures covered: "Budget engagement" (has an active budget period) and
// "Spending categorization" (share of recent transactions with a
// category). "Bills paid on time", "Weekly financial reviews", and
// "Mission engagement" have no backing domain — no due-date tracking, no
// review-logging, no Mission Engine exist anywhere in this codebase.

function computeFinancialHabitsSignals(inputs: ConfidenceCalculationInputs): ConfidenceSignal[] {
  const signals: ConfidenceSignal[] = [];

  // Same reasoning as computeHoldingsTrendSignal: a brand-new owner with
  // zero accounts hasn't had a chance to engage with budgeting yet either
  // — "no budget" is only a real, scoreable fact once there's some
  // underlying financial engagement to judge it against.
  if (inputs.activeAccounts.length === 0) {
    signals.push(unavailableSignal("habits.budget-engagement", "financialHabits", "Budget Engagement", "NO_ACCOUNTS_AT_ALL", "No accounts linked yet."));
  } else {
    const hasBudget = inputs.activeBudgetTotals !== null;
    signals.push({
      id: "habits.budget-engagement",
      pillar: "financialHabits",
      label: "Budget Engagement",
      status: "available",
      score: hasBudget ? 100 : 0,
      polarity: hasBudget ? "positive" : "negative",
      reasonCode: hasBudget ? "HAS_ACTIVE_BUDGET" : "NO_ACTIVE_BUDGET",
      message: hasBudget ? "An active budget period is set up." : "No active budget period — creating one is a fast way to build this pillar.",
    });
  }

  const nonTransfer90d = inputs.transactions90d.filter((transaction) => transaction.transactionType !== "transfer");
  if (nonTransfer90d.length === 0) {
    signals.push(
      unavailableSignal(
        "habits.categorization-rate",
        "financialHabits",
        "Spending Categorization",
        "NO_TRANSACTIONS",
        "No transactions in the last 90 days to measure categorization against.",
      ),
    );
  } else {
    const categorized = nonTransfer90d.filter((transaction) => transaction.categoryId !== null).length;
    const rate = (categorized / nonTransfer90d.length) * 100;
    signals.push({
      id: "habits.categorization-rate",
      pillar: "financialHabits",
      label: "Spending Categorization",
      status: "available",
      score: rate,
      polarity: rate >= 90 ? "positive" : rate >= 50 ? "neutral" : "negative",
      reasonCode: rate >= 90 ? "WELL_CATEGORIZED" : rate >= 50 ? "PARTIALLY_CATEGORIZED" : "POORLY_CATEGORIZED",
      message: `${formatPercent(rate)} of recent transactions are categorized.`,
    });
  }

  signals.push(productScopeGapSignal("habits.bills-on-time", "financialHabits", "Bills Paid On Time", "no bill due-date tracking exists yet."));
  signals.push(productScopeGapSignal("habits.weekly-reviews", "financialHabits", "Weekly Financial Reviews", "no review-tracking exists yet."));
  signals.push(productScopeGapSignal("habits.mission-engagement", "financialHabits", "Mission Engagement", "the Mission Engine has not been implemented yet."));

  return signals;
}

// ---- Progress & Trajectory (5%) -------------------------------------------
// Measures covered: "Debt reduction" and "Savings growth" both collapse
// into the real Net Worth trend (the same canonical netWorthChange the
// Net Worth page and Dashboard already render), plus "long-term
// consistency" via goal completion rate. "Confidence trend" is
// deliberately NOT a measure here — using this version's own trend as an
// input to itself would be circular. "Mission completion" has no backing
// domain.

function computeProgressTrajectorySignals(inputs: ConfidenceCalculationInputs): ConfidenceSignal[] {
  const signals: ConfidenceSignal[] = [];
  const netWorthChange = inputs.netWorth.netWorthChange;

  if (!inputs.netWorth.hasHistory || !netWorthChange || netWorthChange.percentChange === null) {
    signals.push(
      unavailableSignal(
        "progress.net-worth-trend",
        "progressTrajectory",
        "Net Worth Trend",
        "NO_HISTORY",
        "No historical Net Worth snapshot yet to measure a trend.",
      ),
    );
  } else {
    const pct = netWorthChange.percentChange;
    const score = clamp(50 + pct * 2, 0, 100);
    signals.push({
      id: "progress.net-worth-trend",
      pillar: "progressTrajectory",
      label: "Net Worth Trend",
      status: "available",
      score,
      polarity: pct > 0 ? "positive" : pct < 0 ? "negative" : "neutral",
      reasonCode: pct > 0 ? "NET_WORTH_GROWING" : pct < 0 ? "NET_WORTH_DECLINING" : "NET_WORTH_FLAT",
      message: `Net worth has ${pct >= 0 ? "increased" : "decreased"} ${formatPercent(Math.abs(pct))} since ${netWorthChange.comparisonDate}.`,
    });
  }

  const countedGoals = inputs.goalProgressList.filter((progress) => progress.goal.status !== "archived");
  if (countedGoals.length === 0) {
    signals.push(unavailableSignal("progress.goal-completion-rate", "progressTrajectory", "Goal Completion Rate", "NO_GOALS", "No goals set yet."));
  } else {
    const onTrackOrDone = countedGoals.filter(
      (progress) => progress.health === "completed" || progress.health === "excellent" || progress.health === "on-track",
    ).length;
    const rate = (onTrackOrDone / countedGoals.length) * 100;
    signals.push({
      id: "progress.goal-completion-rate",
      pillar: "progressTrajectory",
      label: "Goal Completion Rate",
      status: "available",
      score: rate,
      polarity: rate >= 75 ? "positive" : rate >= 40 ? "neutral" : "negative",
      reasonCode: rate >= 75 ? "GOALS_ON_TRACK" : rate >= 40 ? "GOALS_MIXED" : "GOALS_BEHIND",
      message: `${formatPercent(rate)} of goals are on track or completed.`,
    });
  }

  signals.push(productScopeGapSignal("progress.mission-completion", "progressTrajectory", "Mission Completion", "the Mission Engine has not been implemented yet."));

  return signals;
}

// ---- Aggregation ----------------------------------------------------------

const PILLAR_SIGNAL_FNS: Record<ConfidencePillarId, (inputs: ConfidenceCalculationInputs) => ConfidenceSignal[]> = {
  cashFlow: computeCashFlowSignals,
  resilience: computeResilienceSignals,
  debtHealth: computeDebtHealthSignals,
  savings: computeSavingsSignals,
  investing: computeInvestingSignals,
  retirement: computeRetirementSignals,
  financialHabits: computeFinancialHabitsSignals,
  progressTrajectory: computeProgressTrajectorySignals,
};

export function computeConfidenceScore(inputs: ConfidenceCalculationInputs): ConfidenceResult {
  const pillars: ConfidencePillarResult[] = PILLAR_IDS.map((id) => {
    const signals = PILLAR_SIGNAL_FNS[id](inputs);
    const available = signals.filter((signal) => signal.status === "available" && signal.score !== null);
    const status: "available" | "unavailable" = available.length > 0 ? "available" : "unavailable";
    const score = status === "available" ? available.reduce((sum, signal) => sum + (signal.score ?? 0), 0) / available.length : null;

    return { id, label: PILLAR_LABELS[id], weight: PILLAR_WEIGHTS[id], status, score, effectiveWeight: 0, signals };
  });

  const totalAvailableWeight = pillars.filter((pillar) => pillar.status === "available").reduce((sum, pillar) => sum + pillar.weight, 0);
  for (const pillar of pillars) {
    pillar.effectiveWeight = pillar.status === "available" && totalAvailableWeight > 0 ? pillar.weight / totalAvailableWeight : 0;
  }

  const overallScoreRaw =
    totalAvailableWeight > 0
      ? pillars.reduce((sum, pillar) => sum + (pillar.status === "available" ? (pillar.score ?? 0) * pillar.effectiveWeight : 0), 0)
      : null;
  const overallScore = overallScoreRaw === null ? null : Math.round(clamp(overallScoreRaw, 0, 100));
  const band = overallScore === null ? null : bandForScore(overallScore);

  return { asOf: inputs.asOf, overallScore, band, pillars };
}
