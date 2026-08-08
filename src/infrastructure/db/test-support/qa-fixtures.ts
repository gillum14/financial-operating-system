// A reusable, exact-ID-scoped fixture/cleanup helper for QA — both live,
// real-DB verification (browser sessions against SUPABASE_TEST_USER_A/B)
// and DB-backed integration tests. Added directly in response to a real
// incident (Confidence Insights V1, 2026-08-07): an ad-hoc
// `DELETE FROM categories WHERE owner_id = ownerId`, meant to remove one
// temporary verification row, also deleted 5 unrelated pre-existing rows
// for the same owner (see docs/development-seed-baseline.md's
// "Correction (Confidence Insights V1, 2026-08-07)" note, and the
// 2026-08-06 incident in docs/testing.md that this project's DB-test guard
// itself was built for — same class of mistake, different call site).
//
// The fix here is structural, not "remember to scope carefully": every
// createX() call records the exact row it inserted, and cleanup() takes NO
// arguments — there is no method on this class that accepts an owner id,
// an email, or any other filter. It is not possible to call broad cleanup
// through this API; the only thing cleanup() can ever delete is exactly
// what this instance tracked.
import { eq } from "drizzle-orm";

import type { DbClient } from "@/db/client";
import {
  accountBalanceSnapshots,
  accounts,
  budgetAllocationAdjustments,
  budgetAllocations,
  budgetPeriods,
  categories,
  confidenceScoreSnapshots,
  goalAllocations,
  goalContributions,
  goals,
  transactions,
  type Account,
  type AccountBalanceSnapshot,
  type BudgetAllocation,
  type BudgetAllocationAdjustment,
  type BudgetPeriod,
  type Category,
  type ConfidenceScoreSnapshot,
  type Goal,
  type GoalAllocation,
  type GoalContribution,
  type NewAccount,
  type NewAccountBalanceSnapshot,
  type NewBudgetAllocation,
  type NewBudgetAllocationAdjustment,
  type NewBudgetPeriod,
  type NewCategory,
  type NewConfidenceScoreSnapshot,
  type NewGoal,
  type NewGoalAllocation,
  type NewGoalContribution,
  type NewTransaction,
  type Transaction,
} from "@/db/schema";

// Every domain a live QA session currently exercises. Keyed by actual
// table name (snake_case, matching Postgres) so trackExisting() and error
// messages both read the same way the incident writeups above do.
const QA_FIXTURE_TABLES = {
  categories,
  accounts,
  transactions,
  goals,
  goal_contributions: goalContributions,
  goal_allocations: goalAllocations,
  budget_periods: budgetPeriods,
  budget_allocations: budgetAllocations,
  budget_allocation_adjustments: budgetAllocationAdjustments,
  confidence_score_snapshots: confidenceScoreSnapshots,
  account_balance_snapshots: accountBalanceSnapshots,
} as const;

export type QaFixtureTableName = keyof typeof QA_FIXTURE_TABLES;

interface LedgerEntry {
  tableName: QaFixtureTableName;
  id: string;
}

export interface QaCleanupReport {
  deleted: { table: QaFixtureTableName; id: string }[];
  totalTracked: number;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class QaFixtureSet {
  private readonly ledger: LedgerEntry[] = [];

  constructor(private readonly db: DbClient) {}

  get trackedCount(): number {
    return this.ledger.length;
  }

  // The one guardrail every tracked id passes through, whether it came
  // from a createX() call or trackExisting(): must be a real UUID, never
  // undefined/empty/an accidentally-passed owner id shaped like one thing
  // but meant as another. Fails loudly (throws) rather than silently
  // recording something that would later delete nothing — or, worse,
  // silently coercing into a broader match.
  private record(tableName: QaFixtureTableName, id: string): void {
    if (typeof id !== "string" || !UUID_RE.test(id)) {
      throw new Error(
        `QaFixtureSet guardrail: refusing to track "${tableName}" with a non-UUID id (${JSON.stringify(id)}). ` +
          "Every QA fixture must be tracked by its exact primary key, never a broader value.",
      );
    }
    this.ledger.push({ tableName, id });
  }

  async createCategory(input: NewCategory): Promise<Category> {
    const [row] = await this.db.insert(categories).values(input).returning();
    this.record("categories", row.id);
    return row;
  }

  async createAccount(input: NewAccount): Promise<Account> {
    const [row] = await this.db.insert(accounts).values(input).returning();
    this.record("accounts", row.id);
    return row;
  }

  async createTransaction(input: NewTransaction): Promise<Transaction> {
    const [row] = await this.db.insert(transactions).values(input).returning();
    this.record("transactions", row.id);
    return row;
  }

  async createGoal(input: NewGoal): Promise<Goal> {
    const [row] = await this.db.insert(goals).values(input).returning();
    this.record("goals", row.id);
    return row;
  }

  async createGoalContribution(input: NewGoalContribution): Promise<GoalContribution> {
    const [row] = await this.db.insert(goalContributions).values(input).returning();
    this.record("goal_contributions", row.id);
    return row;
  }

  async createGoalAllocation(input: NewGoalAllocation): Promise<GoalAllocation> {
    const [row] = await this.db.insert(goalAllocations).values(input).returning();
    this.record("goal_allocations", row.id);
    return row;
  }

  async createBudgetPeriod(input: NewBudgetPeriod): Promise<BudgetPeriod> {
    const [row] = await this.db.insert(budgetPeriods).values(input).returning();
    this.record("budget_periods", row.id);
    return row;
  }

  async createBudgetAllocation(input: NewBudgetAllocation): Promise<BudgetAllocation> {
    const [row] = await this.db.insert(budgetAllocations).values(input).returning();
    this.record("budget_allocations", row.id);
    return row;
  }

  async createBudgetAllocationAdjustment(input: NewBudgetAllocationAdjustment): Promise<BudgetAllocationAdjustment> {
    const [row] = await this.db.insert(budgetAllocationAdjustments).values(input).returning();
    this.record("budget_allocation_adjustments", row.id);
    return row;
  }

  async createConfidenceScoreSnapshot(input: NewConfidenceScoreSnapshot): Promise<ConfidenceScoreSnapshot> {
    const [row] = await this.db.insert(confidenceScoreSnapshots).values(input).returning();
    this.record("confidence_score_snapshots", row.id);
    return row;
  }

  async createAccountBalanceSnapshot(input: NewAccountBalanceSnapshot): Promise<AccountBalanceSnapshot> {
    const [row] = await this.db.insert(accountBalanceSnapshots).values(input).returning();
    this.record("account_balance_snapshots", row.id);
    return row;
  }

  // For a row this helper didn't insert itself — e.g. one produced through
  // a real server action or UI flow during live QA verification, which
  // still needs to be cleaned up afterward. Still exact-ID only: names one
  // specific table and one specific id, never a filter — there is no
  // "trackAllForOwner" and there never should be.
  trackExisting(tableName: QaFixtureTableName, id: string): void {
    this.record(tableName, id);
  }

  // Deletes every tracked row, in the exact reverse of the order it was
  // created/tracked, and nothing else. This is FK-safe by construction: a
  // row can only be created (or explicitly tracked) after every row it
  // references already exists — you need a goal's id to create a
  // contribution against it, an account's id to create a transaction on
  // it, a parent category's id to create a child category under it — so a
  // dependent row always appears later in the ledger than what it depends
  // on. Deleting newest-first therefore always removes children before
  // the parents/references they point to, with no hardcoded per-table
  // ordering to keep in sync as domains are added.
  //
  // Idempotent: each entry is popped off the ledger before its delete
  // runs, so a delete that already happened is never retried, and calling
  // cleanup() again on an empty (or partially-drained, after a prior
  // failure) ledger is always a safe no-op. Deleting an id that's already
  // gone is itself a no-op at the SQL level (0 rows affected, not an
  // error), so a retry after a partial failure is also safe.
  async cleanup(): Promise<QaCleanupReport> {
    const deleted: { table: QaFixtureTableName; id: string }[] = [];

    while (this.ledger.length > 0) {
      const entry = this.ledger[this.ledger.length - 1];
      const table = QA_FIXTURE_TABLES[entry.tableName];
      await this.db.delete(table).where(eq(table.id, entry.id));
      this.ledger.pop();
      deleted.push({ table: entry.tableName, id: entry.id });
    }

    return { deleted, totalTracked: deleted.length };
  }
}

export function createQaFixtureSet(db: DbClient): QaFixtureSet {
  return new QaFixtureSet(db);
}
