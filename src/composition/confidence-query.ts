import "server-only";

import {
  computeConfidenceScore,
  type ConfidenceCalculationInputs,
  type ConfidenceResult,
} from "@/application/confidence/confidence-calculations";
import {
  computeConfidenceTrend,
  selectComparisonSnapshot,
  type StoredConfidenceSnapshot,
} from "@/application/confidence/confidence-history-calculations";
import type { ConfidenceOverviewView } from "@/application/confidence/confidence-views";
import { db } from "@/db/client";
import { DrizzleAccountRepository } from "@/infrastructure/db/accounts-repository";
import { DrizzleConfidenceScoreSnapshotRepository } from "@/infrastructure/db/confidence-repository";
import { DrizzleTransactionRepository } from "@/infrastructure/db/transactions-repository";

import { getBudgetService } from "./budgets-composition";
import { getGoalService } from "./goals-composition";
import { getNetWorthOverview } from "./net-worth-query";

export type { ConfidenceOverviewView };

// Server-only orchestration for the Confidence Engine — the one canonical
// place a Confidence Score is assembled. It never recomputes Budget,
// Goal, or Net Worth math itself: BudgetService.getBudgetPeriodSummary,
// GoalService.listGoalsWithProgress, and getNetWorthOverview are called
// directly (the exact same functions Budgets/Goals/Net Worth's own pages
// call), and their real output is handed to computeConfidenceScore
// unchanged. Accounts/Transactions are fetched via their repositories
// directly (a plain read, not a calculation) the same way
// DashboardService already does for its own simpler needs.
const accountRepository = new DrizzleAccountRepository(db);
const transactionRepository = new DrizzleTransactionRepository(db);
const snapshotRepository = new DrizzleConfidenceScoreSnapshotRepository(db);

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function daysAgo(from: Date, days: number): Date {
  const date = new Date(from);
  date.setDate(date.getDate() - days);
  return date;
}

export async function getConfidenceCalculationInputs(ownerId: string, asOf: Date = new Date()): Promise<ConfidenceCalculationInputs> {
  const dateTo = formatDate(asOf);
  const dateFrom30 = formatDate(daysAgo(asOf, 30));
  const dateFrom90 = formatDate(daysAgo(asOf, 90));

  const [activeAccounts, transactions30d, transactions90d, activeBudgetPeriod, goalProgressList, netWorth] = await Promise.all([
    accountRepository.listForOwner(ownerId, "active"),
    transactionRepository.listForOwner(ownerId, { dateFrom: dateFrom30, dateTo }),
    transactionRepository.listForOwner(ownerId, { dateFrom: dateFrom90, dateTo }),
    getBudgetService().getActiveBudgetPeriod(ownerId),
    getGoalService().listGoalsWithProgress(ownerId),
    getNetWorthOverview(ownerId),
  ]);

  const activeBudgetSummary = activeBudgetPeriod
    ? await getBudgetService().getBudgetPeriodSummary(ownerId, activeBudgetPeriod.id)
    : null;

  return {
    asOf,
    activeAccounts,
    transactions30d,
    transactions90d,
    activeBudgetTotals: activeBudgetSummary ? activeBudgetSummary.totals : null,
    goalProgressList,
    netWorth,
  };
}

// The one canonical current-score computation — called by both the read
// path below and the capture composition (confidence-composition.ts),
// so a captured snapshot can never disagree with what a live read would
// have shown at that moment.
export async function computeCurrentConfidenceScore(ownerId: string, asOf: Date = new Date()): Promise<ConfidenceResult> {
  const inputs = await getConfidenceCalculationInputs(ownerId, asOf);
  return computeConfidenceScore(inputs);
}

export async function getConfidenceOverview(ownerId: string): Promise<ConfidenceOverviewView> {
  const asOf = new Date();
  const [result, snapshots] = await Promise.all([
    computeCurrentConfidenceScore(ownerId, asOf),
    snapshotRepository.listForOwner(ownerId),
  ]);

  const storedSnapshots: StoredConfidenceSnapshot[] = snapshots.map((snapshot) => ({
    snapshotDate: snapshot.snapshotDate,
    overallScore: snapshot.overallScore,
    pillarScores: snapshot.pillarScores,
  }));
  const comparison = selectComparisonSnapshot(storedSnapshots);
  const trend = computeConfidenceTrend(result, comparison);

  return {
    hasEvidence: result.overallScore !== null,
    overallScore: result.overallScore,
    band: result.band,
    pillars: result.pillars,
    asOfLabel: asOf.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }),
    hasHistory: comparison !== null,
    trend,
  };
}
