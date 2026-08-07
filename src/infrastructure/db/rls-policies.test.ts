import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { DbClient } from "@/db/client";
import {
  accountBalanceSnapshots,
  accounts,
  budgetAllocationAdjustments,
  budgetAllocations,
  budgetPeriods,
  categories,
  dataProviderConnections,
  goalAllocations,
  goalContributions,
  goals,
  institutions,
  transactions,
  users,
} from "@/db/schema";

import { runAsAuthenticatedUser } from "./test-support/run-as-authenticated-user";
import { createTestDbClient, isDbTestingAllowed } from "./test-support/test-db-client";
import { withRollback } from "./test-support/with-rollback";

// See db-test-guard.ts — requires ALLOW_DB_TESTS=true and a separate
// TEST_DATABASE_URL, never DATABASE_URL. Skipped entirely (and no real
// connection opened) when the guard refuses. Also requires the two fixed
// RLS test identities to already exist in auth.users (see .env.local /
// README's "RLS test users" setup) — they are NOT created or torn down by
// this file; they're a persistent, non-production fixture on the dev
// project.
const hasDatabase = isDbTestingAllowed();
const USER_A_ID = "10000000-0000-4000-8000-00000000000a";
const USER_B_ID = "10000000-0000-4000-8000-00000000000b";

// Verified against the live database (see Slice report) — Postgres RLS has
// three distinct failure shapes, asserted precisely below rather than
// guessed:
//   1. No GRANT at all for the operation -> throws "permission denied".
//   2. GRANT exists, USING excludes the row -> silent 0 rows, no error.
//   3. GRANT exists, USING matches, but the resulting row fails WITH CHECK
//      (e.g. an ownership reassignment) -> throws "violates row-level
//      security policy". INSERT has no USING concept, so a WITH CHECK
//      failure on INSERT always throws (case 3), never case 2.
//
// Drizzle wraps the real Postgres error in a DrizzleQueryError whose own
// .message is just "Failed query: ...\nparams: ..." — the actual denial
// reason is on .cause (a PostgresError). This unwraps it so assertions can
// check *which* failure mode occurred, not just that something failed.
async function expectDenied(promise: Promise<unknown>, pattern: RegExp): Promise<void> {
  let caught: unknown;
  try {
    await promise;
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(Error);
  const cause = (caught as { cause?: unknown }).cause;
  const message = cause instanceof Error ? cause.message : (caught as Error).message;
  expect(message).toMatch(pattern);
}

describe.skipIf(!hasDatabase)("Row Level Security policies (integration)", () => {
  let db: DbClient;
  let close: () => Promise<void>;

  beforeAll(() => {
    const client = createTestDbClient();
    db = client.db;
    close = client.close;
  });

  afterAll(async () => {
    await close();
  });

  describe("public.users", () => {
    it("User A can read own profile", async () => {
      await withRollback(db, async (tx) => {
        await runAsAuthenticatedUser(tx, USER_A_ID);
        const rows = await tx.select().from(users).where(eq(users.id, USER_A_ID));
        expect(rows).toHaveLength(1);
      });
    });

    it("User A cannot read User B's profile", async () => {
      await withRollback(db, async (tx) => {
        await runAsAuthenticatedUser(tx, USER_A_ID);
        const rows = await tx.select().from(users).where(eq(users.id, USER_B_ID));
        expect(rows).toHaveLength(0);
      });
    });

    it("an unfiltered select only ever returns the caller's own row", async () => {
      await withRollback(db, async (tx) => {
        await runAsAuthenticatedUser(tx, USER_A_ID);
        const rows = await tx.select({ id: users.id }).from(users);
        expect(rows.map((r) => r.id)).toEqual([USER_A_ID]);
      });
    });

    it("User A cannot insert an arbitrary profile (no INSERT grant at all)", async () => {
      await expectDenied(
        withRollback(db, async (tx) => {
          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx.insert(users).values({ id: randomUUID(), email: "hacker@example.com", displayName: "Hacker" });
        }),
        /permission denied/,
      );
    });

    it("User A cannot delete their profile (no DELETE grant at all)", async () => {
      await expectDenied(
        withRollback(db, async (tx) => {
          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx.delete(users).where(eq(users.id, USER_A_ID));
        }),
        /permission denied/,
      );
    });

    it("User A cannot change their profile id (no UPDATE grant on that column)", async () => {
      await expectDenied(
        withRollback(db, async (tx) => {
          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx.update(users).set({ id: randomUUID() }).where(eq(users.id, USER_A_ID));
        }),
        /permission denied/,
      );
    });

    it("User A can update their own display name", async () => {
      await withRollback(db, async (tx) => {
        await runAsAuthenticatedUser(tx, USER_A_ID);
        const [row] = await tx
          .update(users)
          .set({ displayName: "Updated By RLS Test" })
          .where(eq(users.id, USER_A_ID))
          .returning();
        expect(row.displayName).toBe("Updated By RLS Test");
      });
    });

    it("User A cannot update User B's display name (USING excludes the row)", async () => {
      await withRollback(db, async (tx) => {
        await runAsAuthenticatedUser(tx, USER_A_ID);
        const rows = await tx
          .update(users)
          .set({ displayName: "Hijacked" })
          .where(eq(users.id, USER_B_ID))
          .returning();
        expect(rows).toHaveLength(0);
      });
    });
  });

  describe("accounts", () => {
    it("User A can read own accounts but not User B's", async () => {
      await withRollback(db, async (tx) => {
        const [accountA] = await tx
          .insert(accounts)
          .values({ ownerId: USER_A_ID, name: "A Checking", accountType: "checking" })
          .returning();
        const [accountB] = await tx
          .insert(accounts)
          .values({ ownerId: USER_B_ID, name: "B Checking", accountType: "checking" })
          .returning();

        await runAsAuthenticatedUser(tx, USER_A_ID);
        const own = await tx.select().from(accounts).where(eq(accounts.id, accountA.id));
        const other = await tx.select().from(accounts).where(eq(accounts.id, accountB.id));

        expect(own).toHaveLength(1);
        expect(other).toHaveLength(0);
      });
    });

    it("User A can insert an account with owner_id = self", async () => {
      await withRollback(db, async (tx) => {
        await runAsAuthenticatedUser(tx, USER_A_ID);
        const [row] = await tx
          .insert(accounts)
          .values({ ownerId: USER_A_ID, name: "New", accountType: "checking" })
          .returning();
        expect(row.ownerId).toBe(USER_A_ID);
      });
    });

    it("User A cannot insert an account owned by User B", async () => {
      await expectDenied(
        withRollback(db, async (tx) => {
          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx.insert(accounts).values({ ownerId: USER_B_ID, name: "Planted", accountType: "checking" });
        }),
        /row-level security/,
      );
    });

    it("User A cannot update User B's account", async () => {
      await withRollback(db, async (tx) => {
        const [accountB] = await tx
          .insert(accounts)
          .values({ ownerId: USER_B_ID, name: "B Checking", accountType: "checking" })
          .returning();

        await runAsAuthenticatedUser(tx, USER_A_ID);
        const rows = await tx.update(accounts).set({ name: "Hijacked" }).where(eq(accounts.id, accountB.id)).returning();
        expect(rows).toHaveLength(0);
      });
    });

    it("User A cannot reassign their own account to User B", async () => {
      // Since 0004_harden_owned_table_update_grants.sql, owner_id isn't in
      // the grantable column set at all, so this is now denied at the
      // grant-check level (a stronger guarantee) before RLS's WITH CHECK
      // is ever reached.
      await expectDenied(
        withRollback(db, async (tx) => {
          const [accountA] = await tx
            .insert(accounts)
            .values({ ownerId: USER_A_ID, name: "A Checking", accountType: "checking" })
            .returning();

          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx.update(accounts).set({ ownerId: USER_B_ID }).where(eq(accounts.id, accountA.id));
        }),
        /permission denied/,
      );
    });

    it("matches the approved policy: no DELETE grant, so deletes are rejected outright", async () => {
      await expectDenied(
        withRollback(db, async (tx) => {
          const [accountA] = await tx
            .insert(accounts)
            .values({ ownerId: USER_A_ID, name: "A Checking", accountType: "checking" })
            .returning();
          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx.delete(accounts).where(eq(accounts.id, accountA.id));
        }),
        /permission denied/,
      );
    });
  });

  describe("categories", () => {
    it("User A can read own categories but not User B's", async () => {
      await withRollback(db, async (tx) => {
        const [categoryA] = await tx.insert(categories).values({ ownerId: USER_A_ID, name: "Housing" }).returning();
        const [categoryB] = await tx.insert(categories).values({ ownerId: USER_B_ID, name: "Housing" }).returning();

        await runAsAuthenticatedUser(tx, USER_A_ID);
        const own = await tx.select().from(categories).where(eq(categories.id, categoryA.id));
        const other = await tx.select().from(categories).where(eq(categories.id, categoryB.id));

        expect(own).toHaveLength(1);
        expect(other).toHaveLength(0);
      });
    });

    it("User A can insert a category with owner_id = self", async () => {
      await withRollback(db, async (tx) => {
        await runAsAuthenticatedUser(tx, USER_A_ID);
        const [row] = await tx.insert(categories).values({ ownerId: USER_A_ID, name: "Food" }).returning();
        expect(row.ownerId).toBe(USER_A_ID);
      });
    });

    it("User A cannot insert a category owned by User B", async () => {
      await expectDenied(
        withRollback(db, async (tx) => {
          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx.insert(categories).values({ ownerId: USER_B_ID, name: "Planted" });
        }),
        /row-level security/,
      );
    });

    it("User A cannot update User B's category", async () => {
      await withRollback(db, async (tx) => {
        const [categoryB] = await tx.insert(categories).values({ ownerId: USER_B_ID, name: "Housing" }).returning();

        await runAsAuthenticatedUser(tx, USER_A_ID);
        const rows = await tx
          .update(categories)
          .set({ name: "Hijacked" })
          .where(eq(categories.id, categoryB.id))
          .returning();
        expect(rows).toHaveLength(0);
      });
    });

    it("User A cannot reassign their own category to User B", async () => {
      // Denied at the grant-check level now — see the accounts test above.
      await expectDenied(
        withRollback(db, async (tx) => {
          const [categoryA] = await tx.insert(categories).values({ ownerId: USER_A_ID, name: "Housing" }).returning();

          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx.update(categories).set({ ownerId: USER_B_ID }).where(eq(categories.id, categoryA.id));
        }),
        /permission denied/,
      );
    });

    it("matches the approved policy: no DELETE grant, so deletes are rejected outright", async () => {
      await expectDenied(
        withRollback(db, async (tx) => {
          const [categoryA] = await tx.insert(categories).values({ ownerId: USER_A_ID, name: "Housing" }).returning();
          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx.delete(categories).where(eq(categories.id, categoryA.id));
        }),
        /permission denied/,
      );
    });
  });

  describe("transactions", () => {
    it("User A can read own transactions but not User B's", async () => {
      await withRollback(db, async (tx) => {
        const [accountA] = await tx
          .insert(accounts)
          .values({ ownerId: USER_A_ID, name: "A Checking", accountType: "checking" })
          .returning();
        const [accountB] = await tx
          .insert(accounts)
          .values({ ownerId: USER_B_ID, name: "B Checking", accountType: "checking" })
          .returning();
        const [txnA] = await tx
          .insert(transactions)
          .values({
            ownerId: USER_A_ID,
            accountId: accountA.id,
            transactionDate: "2026-08-01",
            originalDescription: "A TXN",
            amount: "-10.00",
            transactionType: "expense",
          })
          .returning();
        const [txnB] = await tx
          .insert(transactions)
          .values({
            ownerId: USER_B_ID,
            accountId: accountB.id,
            transactionDate: "2026-08-01",
            originalDescription: "B TXN",
            amount: "-10.00",
            transactionType: "expense",
          })
          .returning();

        await runAsAuthenticatedUser(tx, USER_A_ID);
        const own = await tx.select().from(transactions).where(eq(transactions.id, txnA.id));
        const other = await tx.select().from(transactions).where(eq(transactions.id, txnB.id));

        expect(own).toHaveLength(1);
        expect(other).toHaveLength(0);
      });
    });

    it("User A can insert a transaction with owner_id = self", async () => {
      await withRollback(db, async (tx) => {
        const [accountA] = await tx
          .insert(accounts)
          .values({ ownerId: USER_A_ID, name: "A Checking", accountType: "checking" })
          .returning();

        await runAsAuthenticatedUser(tx, USER_A_ID);
        const [row] = await tx
          .insert(transactions)
          .values({
            ownerId: USER_A_ID,
            accountId: accountA.id,
            transactionDate: "2026-08-01",
            originalDescription: "New",
            amount: "-5.00",
            transactionType: "expense",
          })
          .returning();
        expect(row.ownerId).toBe(USER_A_ID);
      });
    });

    it("User A cannot insert a transaction owned by User B", async () => {
      await expectDenied(
        withRollback(db, async (tx) => {
          const [accountB] = await tx
            .insert(accounts)
            .values({ ownerId: USER_B_ID, name: "B Checking", accountType: "checking" })
            .returning();

          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx.insert(transactions).values({
            ownerId: USER_B_ID,
            accountId: accountB.id,
            transactionDate: "2026-08-01",
            originalDescription: "Planted",
            amount: "-5.00",
            transactionType: "expense",
          });
        }),
        /row-level security/,
      );
    });

    it("User A cannot update User B's transaction", async () => {
      await withRollback(db, async (tx) => {
        const [accountB] = await tx
          .insert(accounts)
          .values({ ownerId: USER_B_ID, name: "B Checking", accountType: "checking" })
          .returning();
        const [txnB] = await tx
          .insert(transactions)
          .values({
            ownerId: USER_B_ID,
            accountId: accountB.id,
            transactionDate: "2026-08-01",
            originalDescription: "B TXN",
            amount: "-10.00",
            transactionType: "expense",
          })
          .returning();

        await runAsAuthenticatedUser(tx, USER_A_ID);
        const rows = await tx
          .update(transactions)
          .set({ notes: "Hijacked" })
          .where(eq(transactions.id, txnB.id))
          .returning();
        expect(rows).toHaveLength(0);
      });
    });

    it("User A cannot reassign their own transaction to User B", async () => {
      // Denied at the grant-check level now — see the accounts test above.
      await expectDenied(
        withRollback(db, async (tx) => {
          const [accountA] = await tx
            .insert(accounts)
            .values({ ownerId: USER_A_ID, name: "A Checking", accountType: "checking" })
            .returning();
          const [txnA] = await tx
            .insert(transactions)
            .values({
              ownerId: USER_A_ID,
              accountId: accountA.id,
              transactionDate: "2026-08-01",
              originalDescription: "A TXN",
              amount: "-10.00",
              transactionType: "expense",
            })
            .returning();

          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx.update(transactions).set({ ownerId: USER_B_ID }).where(eq(transactions.id, txnA.id));
        }),
        /permission denied/,
      );
    });

    it("matches the approved policy: no DELETE grant, so deletes are rejected outright", async () => {
      await expectDenied(
        withRollback(db, async (tx) => {
          const [accountA] = await tx
            .insert(accounts)
            .values({ ownerId: USER_A_ID, name: "A Checking", accountType: "checking" })
            .returning();
          const [txnA] = await tx
            .insert(transactions)
            .values({
              ownerId: USER_A_ID,
              accountId: accountA.id,
              transactionDate: "2026-08-01",
              originalDescription: "A TXN",
              amount: "-10.00",
              transactionType: "expense",
            })
            .returning();

          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx.delete(transactions).where(eq(transactions.id, txnA.id));
        }),
        /permission denied/,
      );
    });
  });

  describe("data_provider_connections", () => {
    it("User A can read own connections but not User B's", async () => {
      await withRollback(db, async (tx) => {
        const [connA] = await tx
          .insert(dataProviderConnections)
          .values({ ownerId: USER_A_ID, providerName: "manual" })
          .returning();
        const [connB] = await tx
          .insert(dataProviderConnections)
          .values({ ownerId: USER_B_ID, providerName: "manual" })
          .returning();

        await runAsAuthenticatedUser(tx, USER_A_ID);
        const own = await tx.select().from(dataProviderConnections).where(eq(dataProviderConnections.id, connA.id));
        const other = await tx
          .select()
          .from(dataProviderConnections)
          .where(eq(dataProviderConnections.id, connB.id));

        expect(own).toHaveLength(1);
        expect(other).toHaveLength(0);
      });
    });

    it("User A can insert a connection with owner_id = self", async () => {
      await withRollback(db, async (tx) => {
        await runAsAuthenticatedUser(tx, USER_A_ID);
        const [row] = await tx
          .insert(dataProviderConnections)
          .values({ ownerId: USER_A_ID, providerName: "manual" })
          .returning();
        expect(row.ownerId).toBe(USER_A_ID);
      });
    });

    it("User A cannot insert a connection owned by User B", async () => {
      await expectDenied(
        withRollback(db, async (tx) => {
          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx.insert(dataProviderConnections).values({ ownerId: USER_B_ID, providerName: "manual" });
        }),
        /row-level security/,
      );
    });

    it("User A cannot update User B's connection", async () => {
      await withRollback(db, async (tx) => {
        const [connB] = await tx
          .insert(dataProviderConnections)
          .values({ ownerId: USER_B_ID, providerName: "manual" })
          .returning();

        await runAsAuthenticatedUser(tx, USER_A_ID);
        const rows = await tx
          .update(dataProviderConnections)
          .set({ status: "error" })
          .where(eq(dataProviderConnections.id, connB.id))
          .returning();
        expect(rows).toHaveLength(0);
      });
    });

    it("User A cannot reassign their own connection to User B", async () => {
      // Denied at the grant-check level now — see the accounts test above.
      await expectDenied(
        withRollback(db, async (tx) => {
          const [connA] = await tx
            .insert(dataProviderConnections)
            .values({ ownerId: USER_A_ID, providerName: "manual" })
            .returning();

          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx
            .update(dataProviderConnections)
            .set({ ownerId: USER_B_ID })
            .where(eq(dataProviderConnections.id, connA.id));
        }),
        /permission denied/,
      );
    });

    it("matches the approved policy: no DELETE grant, so deletes are rejected outright", async () => {
      await expectDenied(
        withRollback(db, async (tx) => {
          const [connA] = await tx
            .insert(dataProviderConnections)
            .values({ ownerId: USER_A_ID, providerName: "manual" })
            .returning();
          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx.delete(dataProviderConnections).where(eq(dataProviderConnections.id, connA.id));
        }),
        /permission denied/,
      );
    });
  });

  describe("budget_periods", () => {
    it("User A can read own budget periods but not User B's", async () => {
      await withRollback(db, async (tx) => {
        const [periodA] = await tx
          .insert(budgetPeriods)
          .values({ ownerId: USER_A_ID, periodStart: "2026-08-01", periodEnd: "2026-08-31" })
          .returning();
        const [periodB] = await tx
          .insert(budgetPeriods)
          .values({ ownerId: USER_B_ID, periodStart: "2026-08-01", periodEnd: "2026-08-31" })
          .returning();

        await runAsAuthenticatedUser(tx, USER_A_ID);
        const own = await tx.select().from(budgetPeriods).where(eq(budgetPeriods.id, periodA.id));
        const other = await tx.select().from(budgetPeriods).where(eq(budgetPeriods.id, periodB.id));

        expect(own).toHaveLength(1);
        expect(other).toHaveLength(0);
      });
    });

    it("User A can insert a budget period with owner_id = self", async () => {
      await withRollback(db, async (tx) => {
        await runAsAuthenticatedUser(tx, USER_A_ID);
        const [row] = await tx
          .insert(budgetPeriods)
          .values({ ownerId: USER_A_ID, periodStart: "2026-08-01", periodEnd: "2026-08-31" })
          .returning();
        expect(row.ownerId).toBe(USER_A_ID);
      });
    });

    it("User A cannot insert a budget period owned by User B", async () => {
      await expectDenied(
        withRollback(db, async (tx) => {
          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx.insert(budgetPeriods).values({ ownerId: USER_B_ID, periodStart: "2026-08-01", periodEnd: "2026-08-31" });
        }),
        /row-level security/,
      );
    });

    it("User A cannot update User B's budget period", async () => {
      await withRollback(db, async (tx) => {
        const [periodB] = await tx
          .insert(budgetPeriods)
          .values({ ownerId: USER_B_ID, periodStart: "2026-08-01", periodEnd: "2026-08-31" })
          .returning();

        await runAsAuthenticatedUser(tx, USER_A_ID);
        const rows = await tx
          .update(budgetPeriods)
          .set({ status: "active" })
          .where(eq(budgetPeriods.id, periodB.id))
          .returning();
        expect(rows).toHaveLength(0);
      });
    });

    it("User A cannot reassign their own budget period to User B", async () => {
      await expectDenied(
        withRollback(db, async (tx) => {
          const [periodA] = await tx
            .insert(budgetPeriods)
            .values({ ownerId: USER_A_ID, periodStart: "2026-08-01", periodEnd: "2026-08-31" })
            .returning();

          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx.update(budgetPeriods).set({ ownerId: USER_B_ID }).where(eq(budgetPeriods.id, periodA.id));
        }),
        /permission denied/,
      );
    });

    it("User A cannot change period_start/period_end (only status is grantable)", async () => {
      await expectDenied(
        withRollback(db, async (tx) => {
          const [periodA] = await tx
            .insert(budgetPeriods)
            .values({ ownerId: USER_A_ID, periodStart: "2026-08-01", periodEnd: "2026-08-31" })
            .returning();

          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx.update(budgetPeriods).set({ periodEnd: "2026-09-30" }).where(eq(budgetPeriods.id, periodA.id));
        }),
        /permission denied/,
      );
    });

    it("matches the approved policy: no DELETE grant, so deletes are rejected outright", async () => {
      await expectDenied(
        withRollback(db, async (tx) => {
          const [periodA] = await tx
            .insert(budgetPeriods)
            .values({ ownerId: USER_A_ID, periodStart: "2026-08-01", periodEnd: "2026-08-31" })
            .returning();
          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx.delete(budgetPeriods).where(eq(budgetPeriods.id, periodA.id));
        }),
        /permission denied/,
      );
    });

    it("the database enforces one active period per owner independent of application code", async () => {
      await expectDenied(
        withRollback(db, async (tx) => {
          await tx
            .insert(budgetPeriods)
            .values({ ownerId: USER_A_ID, periodStart: "2026-08-01", periodEnd: "2026-08-31", status: "active" });
          // A second active period for the same owner, inserted directly
          // (bypassing BudgetService entirely) — the partial unique index
          // (budget_periods_one_active_per_owner_idx) must still refuse
          // it, proving this invariant doesn't rely solely on
          // application-layer validation.
          await tx
            .insert(budgetPeriods)
            .values({ ownerId: USER_A_ID, periodStart: "2026-09-01", periodEnd: "2026-09-30", status: "active" });
        }),
        /duplicate key value violates unique constraint/,
      );
    });
  });

  describe("budget_allocations", () => {
    it("User A can read own allocations but not User B's", async () => {
      await withRollback(db, async (tx) => {
        const [periodA] = await tx
          .insert(budgetPeriods)
          .values({ ownerId: USER_A_ID, periodStart: "2026-08-01", periodEnd: "2026-08-31" })
          .returning();
        const [categoryA] = await tx.insert(categories).values({ ownerId: USER_A_ID, name: "Groceries" }).returning();
        const [allocationA] = await tx
          .insert(budgetAllocations)
          .values({ ownerId: USER_A_ID, budgetPeriodId: periodA.id, categoryId: categoryA.id, plannedAmount: "500.00" })
          .returning();

        const [periodB] = await tx
          .insert(budgetPeriods)
          .values({ ownerId: USER_B_ID, periodStart: "2026-08-01", periodEnd: "2026-08-31" })
          .returning();
        const [categoryB] = await tx.insert(categories).values({ ownerId: USER_B_ID, name: "Groceries" }).returning();
        const [allocationB] = await tx
          .insert(budgetAllocations)
          .values({ ownerId: USER_B_ID, budgetPeriodId: periodB.id, categoryId: categoryB.id, plannedAmount: "500.00" })
          .returning();

        await runAsAuthenticatedUser(tx, USER_A_ID);
        const own = await tx.select().from(budgetAllocations).where(eq(budgetAllocations.id, allocationA.id));
        const other = await tx.select().from(budgetAllocations).where(eq(budgetAllocations.id, allocationB.id));

        expect(own).toHaveLength(1);
        expect(other).toHaveLength(0);
      });
    });

    it("User A can insert an allocation with owner_id = self", async () => {
      await withRollback(db, async (tx) => {
        const [periodA] = await tx
          .insert(budgetPeriods)
          .values({ ownerId: USER_A_ID, periodStart: "2026-08-01", periodEnd: "2026-08-31" })
          .returning();
        const [categoryA] = await tx.insert(categories).values({ ownerId: USER_A_ID, name: "Groceries" }).returning();

        await runAsAuthenticatedUser(tx, USER_A_ID);
        const [row] = await tx
          .insert(budgetAllocations)
          .values({ ownerId: USER_A_ID, budgetPeriodId: periodA.id, categoryId: categoryA.id, plannedAmount: "500.00" })
          .returning();
        expect(row.ownerId).toBe(USER_A_ID);
      });
    });

    it("User A cannot insert an allocation owned by User B", async () => {
      await expectDenied(
        withRollback(db, async (tx) => {
          const [periodB] = await tx
            .insert(budgetPeriods)
            .values({ ownerId: USER_B_ID, periodStart: "2026-08-01", periodEnd: "2026-08-31" })
            .returning();
          const [categoryB] = await tx.insert(categories).values({ ownerId: USER_B_ID, name: "Groceries" }).returning();

          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx
            .insert(budgetAllocations)
            .values({ ownerId: USER_B_ID, budgetPeriodId: periodB.id, categoryId: categoryB.id, plannedAmount: "500.00" });
        }),
        /row-level security/,
      );
    });

    it("User A cannot update User B's allocation", async () => {
      await withRollback(db, async (tx) => {
        const [periodB] = await tx
          .insert(budgetPeriods)
          .values({ ownerId: USER_B_ID, periodStart: "2026-08-01", periodEnd: "2026-08-31" })
          .returning();
        const [categoryB] = await tx.insert(categories).values({ ownerId: USER_B_ID, name: "Groceries" }).returning();
        const [allocationB] = await tx
          .insert(budgetAllocations)
          .values({ ownerId: USER_B_ID, budgetPeriodId: periodB.id, categoryId: categoryB.id, plannedAmount: "500.00" })
          .returning();

        await runAsAuthenticatedUser(tx, USER_A_ID);
        const rows = await tx
          .update(budgetAllocations)
          .set({ plannedAmount: "1.00" })
          .where(eq(budgetAllocations.id, allocationB.id))
          .returning();
        expect(rows).toHaveLength(0);
      });
    });

    it("User A cannot reassign their own allocation to User B", async () => {
      await expectDenied(
        withRollback(db, async (tx) => {
          const [periodA] = await tx
            .insert(budgetPeriods)
            .values({ ownerId: USER_A_ID, periodStart: "2026-08-01", periodEnd: "2026-08-31" })
            .returning();
          const [categoryA] = await tx.insert(categories).values({ ownerId: USER_A_ID, name: "Groceries" }).returning();
          const [allocationA] = await tx
            .insert(budgetAllocations)
            .values({ ownerId: USER_A_ID, budgetPeriodId: periodA.id, categoryId: categoryA.id, plannedAmount: "500.00" })
            .returning();

          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx.update(budgetAllocations).set({ ownerId: USER_B_ID }).where(eq(budgetAllocations.id, allocationA.id));
        }),
        /permission denied/,
      );
    });

    it("User A cannot change category_id or budget_period_id (only planned_amount/display_order are grantable)", async () => {
      await expectDenied(
        withRollback(db, async (tx) => {
          const [periodA] = await tx
            .insert(budgetPeriods)
            .values({ ownerId: USER_A_ID, periodStart: "2026-08-01", periodEnd: "2026-08-31" })
            .returning();
          const [categoryA] = await tx.insert(categories).values({ ownerId: USER_A_ID, name: "Groceries" }).returning();
          const [allocationA] = await tx
            .insert(budgetAllocations)
            .values({ ownerId: USER_A_ID, budgetPeriodId: periodA.id, categoryId: categoryA.id, plannedAmount: "500.00" })
            .returning();

          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx.update(budgetAllocations).set({ categoryId: randomUUID() }).where(eq(budgetAllocations.id, allocationA.id));
        }),
        /permission denied/,
      );
    });

    it("matches the approved policy: no DELETE grant, so deletes are rejected outright", async () => {
      await expectDenied(
        withRollback(db, async (tx) => {
          const [periodA] = await tx
            .insert(budgetPeriods)
            .values({ ownerId: USER_A_ID, periodStart: "2026-08-01", periodEnd: "2026-08-31" })
            .returning();
          const [categoryA] = await tx.insert(categories).values({ ownerId: USER_A_ID, name: "Groceries" }).returning();
          const [allocationA] = await tx
            .insert(budgetAllocations)
            .values({ ownerId: USER_A_ID, budgetPeriodId: periodA.id, categoryId: categoryA.id, plannedAmount: "500.00" })
            .returning();
          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx.delete(budgetAllocations).where(eq(budgetAllocations.id, allocationA.id));
        }),
        /permission denied/,
      );
    });
  });

  describe("budget_allocation_adjustments", () => {
    it("User A can read own adjustments but not User B's", async () => {
      await withRollback(db, async (tx) => {
        const [periodA] = await tx
          .insert(budgetPeriods)
          .values({ ownerId: USER_A_ID, periodStart: "2026-08-01", periodEnd: "2026-08-31" })
          .returning();
        const [categoryA] = await tx.insert(categories).values({ ownerId: USER_A_ID, name: "Groceries" }).returning();
        const [allocationA] = await tx
          .insert(budgetAllocations)
          .values({ ownerId: USER_A_ID, budgetPeriodId: periodA.id, categoryId: categoryA.id, plannedAmount: "500.00" })
          .returning();
        const [adjustmentA] = await tx
          .insert(budgetAllocationAdjustments)
          .values({ ownerId: USER_A_ID, budgetAllocationId: allocationA.id, previousAmount: "500.00", newAmount: "600.00" })
          .returning();

        const [periodB] = await tx
          .insert(budgetPeriods)
          .values({ ownerId: USER_B_ID, periodStart: "2026-08-01", periodEnd: "2026-08-31" })
          .returning();
        const [categoryB] = await tx.insert(categories).values({ ownerId: USER_B_ID, name: "Groceries" }).returning();
        const [allocationB] = await tx
          .insert(budgetAllocations)
          .values({ ownerId: USER_B_ID, budgetPeriodId: periodB.id, categoryId: categoryB.id, plannedAmount: "500.00" })
          .returning();
        const [adjustmentB] = await tx
          .insert(budgetAllocationAdjustments)
          .values({ ownerId: USER_B_ID, budgetAllocationId: allocationB.id, previousAmount: "500.00", newAmount: "600.00" })
          .returning();

        await runAsAuthenticatedUser(tx, USER_A_ID);
        const own = await tx
          .select()
          .from(budgetAllocationAdjustments)
          .where(eq(budgetAllocationAdjustments.id, adjustmentA.id));
        const other = await tx
          .select()
          .from(budgetAllocationAdjustments)
          .where(eq(budgetAllocationAdjustments.id, adjustmentB.id));

        expect(own).toHaveLength(1);
        expect(other).toHaveLength(0);
      });
    });

    it("User A can insert an adjustment with owner_id = self", async () => {
      await withRollback(db, async (tx) => {
        const [periodA] = await tx
          .insert(budgetPeriods)
          .values({ ownerId: USER_A_ID, periodStart: "2026-08-01", periodEnd: "2026-08-31" })
          .returning();
        const [categoryA] = await tx.insert(categories).values({ ownerId: USER_A_ID, name: "Groceries" }).returning();
        const [allocationA] = await tx
          .insert(budgetAllocations)
          .values({ ownerId: USER_A_ID, budgetPeriodId: periodA.id, categoryId: categoryA.id, plannedAmount: "500.00" })
          .returning();

        await runAsAuthenticatedUser(tx, USER_A_ID);
        const [row] = await tx
          .insert(budgetAllocationAdjustments)
          .values({ ownerId: USER_A_ID, budgetAllocationId: allocationA.id, previousAmount: "500.00", newAmount: "600.00" })
          .returning();
        expect(row.ownerId).toBe(USER_A_ID);
      });
    });

    it("User A cannot update an adjustment — no UPDATE grant at all, even on their own row", async () => {
      await expectDenied(
        withRollback(db, async (tx) => {
          const [periodA] = await tx
            .insert(budgetPeriods)
            .values({ ownerId: USER_A_ID, periodStart: "2026-08-01", periodEnd: "2026-08-31" })
            .returning();
          const [categoryA] = await tx.insert(categories).values({ ownerId: USER_A_ID, name: "Groceries" }).returning();
          const [allocationA] = await tx
            .insert(budgetAllocations)
            .values({ ownerId: USER_A_ID, budgetPeriodId: periodA.id, categoryId: categoryA.id, plannedAmount: "500.00" })
            .returning();
          const [adjustmentA] = await tx
            .insert(budgetAllocationAdjustments)
            .values({ ownerId: USER_A_ID, budgetAllocationId: allocationA.id, previousAmount: "500.00", newAmount: "600.00" })
            .returning();

          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx
            .update(budgetAllocationAdjustments)
            .set({ newAmount: "9999.00" })
            .where(eq(budgetAllocationAdjustments.id, adjustmentA.id));
        }),
        /permission denied/,
      );
    });

    it("matches the approved policy: no DELETE grant, so deletes are rejected outright", async () => {
      await expectDenied(
        withRollback(db, async (tx) => {
          const [periodA] = await tx
            .insert(budgetPeriods)
            .values({ ownerId: USER_A_ID, periodStart: "2026-08-01", periodEnd: "2026-08-31" })
            .returning();
          const [categoryA] = await tx.insert(categories).values({ ownerId: USER_A_ID, name: "Groceries" }).returning();
          const [allocationA] = await tx
            .insert(budgetAllocations)
            .values({ ownerId: USER_A_ID, budgetPeriodId: periodA.id, categoryId: categoryA.id, plannedAmount: "500.00" })
            .returning();
          const [adjustmentA] = await tx
            .insert(budgetAllocationAdjustments)
            .values({ ownerId: USER_A_ID, budgetAllocationId: allocationA.id, previousAmount: "500.00", newAmount: "600.00" })
            .returning();
          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx.delete(budgetAllocationAdjustments).where(eq(budgetAllocationAdjustments.id, adjustmentA.id));
        }),
        /permission denied/,
      );
    });
  });

  describe("goals", () => {
    it("User A can read own goals but not User B's", async () => {
      await withRollback(db, async (tx) => {
        const [goalA] = await tx
          .insert(goals)
          .values({ ownerId: USER_A_ID, title: "Emergency Fund", targetAmount: "5000.00", goalType: "emergency-fund" })
          .returning();
        const [goalB] = await tx
          .insert(goals)
          .values({ ownerId: USER_B_ID, title: "Emergency Fund", targetAmount: "5000.00", goalType: "emergency-fund" })
          .returning();

        await runAsAuthenticatedUser(tx, USER_A_ID);
        const own = await tx.select().from(goals).where(eq(goals.id, goalA.id));
        const other = await tx.select().from(goals).where(eq(goals.id, goalB.id));

        expect(own).toHaveLength(1);
        expect(other).toHaveLength(0);
      });
    });

    it("User A can insert a goal with owner_id = self", async () => {
      await withRollback(db, async (tx) => {
        await runAsAuthenticatedUser(tx, USER_A_ID);
        const [row] = await tx
          .insert(goals)
          .values({ ownerId: USER_A_ID, title: "Vacation Fund", targetAmount: "2000.00", goalType: "vacation" })
          .returning();
        expect(row.ownerId).toBe(USER_A_ID);
      });
    });

    it("User A cannot insert a goal owned by User B", async () => {
      await expectDenied(
        withRollback(db, async (tx) => {
          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx.insert(goals).values({ ownerId: USER_B_ID, title: "Vacation Fund", targetAmount: "2000.00", goalType: "vacation" });
        }),
        /row-level security/,
      );
    });

    it("User A cannot update User B's goal", async () => {
      await withRollback(db, async (tx) => {
        const [goalB] = await tx
          .insert(goals)
          .values({ ownerId: USER_B_ID, title: "Vacation Fund", targetAmount: "2000.00", goalType: "vacation" })
          .returning();

        await runAsAuthenticatedUser(tx, USER_A_ID);
        const rows = await tx.update(goals).set({ title: "Hijacked" }).where(eq(goals.id, goalB.id)).returning();
        expect(rows).toHaveLength(0);
      });
    });

    it("User A cannot reassign their own goal to User B", async () => {
      await expectDenied(
        withRollback(db, async (tx) => {
          const [goalA] = await tx
            .insert(goals)
            .values({ ownerId: USER_A_ID, title: "Vacation Fund", targetAmount: "2000.00", goalType: "vacation" })
            .returning();

          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx.update(goals).set({ ownerId: USER_B_ID }).where(eq(goals.id, goalA.id));
        }),
        /permission denied/,
      );
    });

    it("User A cannot change display_order (not grantable — server-computed only)", async () => {
      await expectDenied(
        withRollback(db, async (tx) => {
          const [goalA] = await tx
            .insert(goals)
            .values({ ownerId: USER_A_ID, title: "Vacation Fund", targetAmount: "2000.00", goalType: "vacation" })
            .returning();

          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx.update(goals).set({ displayOrder: 5 }).where(eq(goals.id, goalA.id));
        }),
        /permission denied/,
      );
    });

    it("User A can update their own goal's priority and status (pause/resume)", async () => {
      await withRollback(db, async (tx) => {
        const [goalA] = await tx
          .insert(goals)
          .values({ ownerId: USER_A_ID, title: "Vacation Fund", targetAmount: "2000.00", goalType: "vacation" })
          .returning();
        expect(goalA.priority).toBe("medium");

        await runAsAuthenticatedUser(tx, USER_A_ID);
        const [prioritized] = await tx
          .update(goals)
          .set({ priority: "high" })
          .where(eq(goals.id, goalA.id))
          .returning();
        expect(prioritized.priority).toBe("high");

        const [paused] = await tx.update(goals).set({ status: "paused" }).where(eq(goals.id, goalA.id)).returning();
        expect(paused.status).toBe("paused");
      });
    });

    it("matches the approved policy: no DELETE grant, so deletes are rejected outright", async () => {
      await expectDenied(
        withRollback(db, async (tx) => {
          const [goalA] = await tx
            .insert(goals)
            .values({ ownerId: USER_A_ID, title: "Vacation Fund", targetAmount: "2000.00", goalType: "vacation" })
            .returning();
          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx.delete(goals).where(eq(goals.id, goalA.id));
        }),
        /permission denied/,
      );
    });
  });

  describe("goal_contributions", () => {
    it("User A can read own contributions but not User B's", async () => {
      await withRollback(db, async (tx) => {
        const [goalA] = await tx
          .insert(goals)
          .values({ ownerId: USER_A_ID, title: "Vacation Fund", targetAmount: "2000.00", goalType: "vacation" })
          .returning();
        const [contributionA] = await tx
          .insert(goalContributions)
          .values({ ownerId: USER_A_ID, goalId: goalA.id, amount: "100.00", contributionDate: "2026-08-01" })
          .returning();

        const [goalB] = await tx
          .insert(goals)
          .values({ ownerId: USER_B_ID, title: "Vacation Fund", targetAmount: "2000.00", goalType: "vacation" })
          .returning();
        const [contributionB] = await tx
          .insert(goalContributions)
          .values({ ownerId: USER_B_ID, goalId: goalB.id, amount: "100.00", contributionDate: "2026-08-01" })
          .returning();

        await runAsAuthenticatedUser(tx, USER_A_ID);
        const own = await tx.select().from(goalContributions).where(eq(goalContributions.id, contributionA.id));
        const other = await tx.select().from(goalContributions).where(eq(goalContributions.id, contributionB.id));

        expect(own).toHaveLength(1);
        expect(other).toHaveLength(0);
      });
    });

    it("User A can insert a contribution with owner_id = self", async () => {
      await withRollback(db, async (tx) => {
        const [goalA] = await tx
          .insert(goals)
          .values({ ownerId: USER_A_ID, title: "Vacation Fund", targetAmount: "2000.00", goalType: "vacation" })
          .returning();

        await runAsAuthenticatedUser(tx, USER_A_ID);
        const [row] = await tx
          .insert(goalContributions)
          .values({ ownerId: USER_A_ID, goalId: goalA.id, amount: "100.00", contributionDate: "2026-08-01" })
          .returning();
        expect(row.ownerId).toBe(USER_A_ID);
      });
    });

    it("User A cannot insert a contribution owned by User B", async () => {
      await expectDenied(
        withRollback(db, async (tx) => {
          const [goalB] = await tx
            .insert(goals)
            .values({ ownerId: USER_B_ID, title: "Vacation Fund", targetAmount: "2000.00", goalType: "vacation" })
            .returning();

          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx
            .insert(goalContributions)
            .values({ ownerId: USER_B_ID, goalId: goalB.id, amount: "100.00", contributionDate: "2026-08-01" });
        }),
        /row-level security/,
      );
    });

    it("User A can update their own contribution's amount — unlike budget_allocation_adjustments, edits are a real workflow here", async () => {
      await withRollback(db, async (tx) => {
        const [goalA] = await tx
          .insert(goals)
          .values({ ownerId: USER_A_ID, title: "Vacation Fund", targetAmount: "2000.00", goalType: "vacation" })
          .returning();
        const [contributionA] = await tx
          .insert(goalContributions)
          .values({ ownerId: USER_A_ID, goalId: goalA.id, amount: "100.00", contributionDate: "2026-08-01" })
          .returning();

        await runAsAuthenticatedUser(tx, USER_A_ID);
        const [row] = await tx
          .update(goalContributions)
          .set({ amount: "150.00" })
          .where(eq(goalContributions.id, contributionA.id))
          .returning();
        expect(row.amount).toBe("150.0000");
      });
    });

    it("User A cannot update User B's contribution", async () => {
      await withRollback(db, async (tx) => {
        const [goalB] = await tx
          .insert(goals)
          .values({ ownerId: USER_B_ID, title: "Vacation Fund", targetAmount: "2000.00", goalType: "vacation" })
          .returning();
        const [contributionB] = await tx
          .insert(goalContributions)
          .values({ ownerId: USER_B_ID, goalId: goalB.id, amount: "100.00", contributionDate: "2026-08-01" })
          .returning();

        await runAsAuthenticatedUser(tx, USER_A_ID);
        const rows = await tx
          .update(goalContributions)
          .set({ amount: "999.00" })
          .where(eq(goalContributions.id, contributionB.id))
          .returning();
        expect(rows).toHaveLength(0);
      });
    });

    it("User A cannot change goal_id (not grantable — immutable once a contribution exists)", async () => {
      await expectDenied(
        withRollback(db, async (tx) => {
          const [goalA] = await tx
            .insert(goals)
            .values({ ownerId: USER_A_ID, title: "Vacation Fund", targetAmount: "2000.00", goalType: "vacation" })
            .returning();
          const [otherGoalA] = await tx
            .insert(goals)
            .values({ ownerId: USER_A_ID, title: "House Down Payment", targetAmount: "50000.00", goalType: "home" })
            .returning();
          const [contributionA] = await tx
            .insert(goalContributions)
            .values({ ownerId: USER_A_ID, goalId: goalA.id, amount: "100.00", contributionDate: "2026-08-01" })
            .returning();

          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx
            .update(goalContributions)
            .set({ goalId: otherGoalA.id })
            .where(eq(goalContributions.id, contributionA.id));
        }),
        /permission denied/,
      );
    });

    it("matches the approved policy: no DELETE grant, so removal is soft-delete only", async () => {
      await expectDenied(
        withRollback(db, async (tx) => {
          const [goalA] = await tx
            .insert(goals)
            .values({ ownerId: USER_A_ID, title: "Vacation Fund", targetAmount: "2000.00", goalType: "vacation" })
            .returning();
          const [contributionA] = await tx
            .insert(goalContributions)
            .values({ ownerId: USER_A_ID, goalId: goalA.id, amount: "100.00", contributionDate: "2026-08-01" })
            .returning();
          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx.delete(goalContributions).where(eq(goalContributions.id, contributionA.id));
        }),
        /permission denied/,
      );
    });
  });

  describe("goal_allocations", () => {
    it("User A can read own allocations but not User B's", async () => {
      await withRollback(db, async (tx) => {
        const [goalA] = await tx
          .insert(goals)
          .values({ ownerId: USER_A_ID, title: "Emergency Fund", targetAmount: "5000.00", goalType: "emergency-fund" })
          .returning();
        const [accountA] = await tx
          .insert(accounts)
          .values({ ownerId: USER_A_ID, name: "Savings", accountType: "savings", currentBalance: "10000.00" })
          .returning();
        const [allocationA] = await tx
          .insert(goalAllocations)
          .values({ ownerId: USER_A_ID, goalId: goalA.id, accountId: accountA.id, amount: "2000.00" })
          .returning();

        const [goalB] = await tx
          .insert(goals)
          .values({ ownerId: USER_B_ID, title: "Emergency Fund", targetAmount: "5000.00", goalType: "emergency-fund" })
          .returning();
        const [accountB] = await tx
          .insert(accounts)
          .values({ ownerId: USER_B_ID, name: "Savings", accountType: "savings", currentBalance: "10000.00" })
          .returning();
        const [allocationB] = await tx
          .insert(goalAllocations)
          .values({ ownerId: USER_B_ID, goalId: goalB.id, accountId: accountB.id, amount: "2000.00" })
          .returning();

        await runAsAuthenticatedUser(tx, USER_A_ID);
        const own = await tx.select().from(goalAllocations).where(eq(goalAllocations.id, allocationA.id));
        const other = await tx.select().from(goalAllocations).where(eq(goalAllocations.id, allocationB.id));

        expect(own).toHaveLength(1);
        expect(other).toHaveLength(0);
      });
    });

    it("User A can insert an allocation with owner_id = self", async () => {
      await withRollback(db, async (tx) => {
        const [goalA] = await tx
          .insert(goals)
          .values({ ownerId: USER_A_ID, title: "Emergency Fund", targetAmount: "5000.00", goalType: "emergency-fund" })
          .returning();
        const [accountA] = await tx
          .insert(accounts)
          .values({ ownerId: USER_A_ID, name: "Savings", accountType: "savings", currentBalance: "10000.00" })
          .returning();

        await runAsAuthenticatedUser(tx, USER_A_ID);
        const [row] = await tx
          .insert(goalAllocations)
          .values({ ownerId: USER_A_ID, goalId: goalA.id, accountId: accountA.id, amount: "2000.00" })
          .returning();
        expect(row.ownerId).toBe(USER_A_ID);
      });
    });

    // Two independent denial layers stack here, and the trigger's own
    // account lookup is the one that actually fires first: BEFORE ROW
    // triggers run before a statement's own RLS WITH CHECK is evaluated,
    // and the trigger's `SELECT ... FROM accounts` runs as the
    // `authenticated` role too — so under User A's session, RLS on
    // `accounts` itself already hides User B's account before the
    // trigger's overallocation math ever runs, surfacing as
    // goal_allocations_no_balance rather than the outer INSERT's WITH
    // CHECK failure. Either denial reason proves the same thing (User A
    // cannot insert an allocation owned by User B); asserting on both is
    // documenting a real defense-in-depth interaction, not loosening the
    // test.
    it("User A cannot insert an allocation owned by User B", async () => {
      await expectDenied(
        withRollback(db, async (tx) => {
          const [goalB] = await tx
            .insert(goals)
            .values({ ownerId: USER_B_ID, title: "Emergency Fund", targetAmount: "5000.00", goalType: "emergency-fund" })
            .returning();
          const [accountB] = await tx
            .insert(accounts)
            .values({ ownerId: USER_B_ID, name: "Savings", accountType: "savings", currentBalance: "10000.00" })
            .returning();

          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx.insert(goalAllocations).values({ ownerId: USER_B_ID, goalId: goalB.id, accountId: accountB.id, amount: "2000.00" });
        }),
        /row-level security|goal_allocations_no_balance/,
      );
    });

    it("User A cannot update User B's allocation", async () => {
      await withRollback(db, async (tx) => {
        const [goalB] = await tx
          .insert(goals)
          .values({ ownerId: USER_B_ID, title: "Emergency Fund", targetAmount: "5000.00", goalType: "emergency-fund" })
          .returning();
        const [accountB] = await tx
          .insert(accounts)
          .values({ ownerId: USER_B_ID, name: "Savings", accountType: "savings", currentBalance: "10000.00" })
          .returning();
        const [allocationB] = await tx
          .insert(goalAllocations)
          .values({ ownerId: USER_B_ID, goalId: goalB.id, accountId: accountB.id, amount: "2000.00" })
          .returning();

        await runAsAuthenticatedUser(tx, USER_A_ID);
        const rows = await tx
          .update(goalAllocations)
          .set({ amount: "9999.00" })
          .where(eq(goalAllocations.id, allocationB.id))
          .returning();
        expect(rows).toHaveLength(0);
      });
    });

    it("User A cannot change goal_id or account_id (only amount is grantable)", async () => {
      await expectDenied(
        withRollback(db, async (tx) => {
          const [goalA] = await tx
            .insert(goals)
            .values({ ownerId: USER_A_ID, title: "Emergency Fund", targetAmount: "5000.00", goalType: "emergency-fund" })
            .returning();
          const [otherGoalA] = await tx
            .insert(goals)
            .values({ ownerId: USER_A_ID, title: "Vacation Fund", targetAmount: "2000.00", goalType: "vacation" })
            .returning();
          const [accountA] = await tx
            .insert(accounts)
            .values({ ownerId: USER_A_ID, name: "Savings", accountType: "savings", currentBalance: "10000.00" })
            .returning();
          const [allocationA] = await tx
            .insert(goalAllocations)
            .values({ ownerId: USER_A_ID, goalId: goalA.id, accountId: accountA.id, amount: "2000.00" })
            .returning();

          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx.update(goalAllocations).set({ goalId: otherGoalA.id }).where(eq(goalAllocations.id, allocationA.id));
        }),
        /permission denied/,
      );
    });

    it("matches the approved policy: no DELETE grant, so removal is soft-delete only", async () => {
      await expectDenied(
        withRollback(db, async (tx) => {
          const [goalA] = await tx
            .insert(goals)
            .values({ ownerId: USER_A_ID, title: "Emergency Fund", targetAmount: "5000.00", goalType: "emergency-fund" })
            .returning();
          const [accountA] = await tx
            .insert(accounts)
            .values({ ownerId: USER_A_ID, name: "Savings", accountType: "savings", currentBalance: "10000.00" })
            .returning();
          const [allocationA] = await tx
            .insert(goalAllocations)
            .values({ ownerId: USER_A_ID, goalId: goalA.id, accountId: accountA.id, amount: "2000.00" })
            .returning();
          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx.delete(goalAllocations).where(eq(goalAllocations.id, allocationA.id));
        }),
        /permission denied/,
      );
    });

    // ADR-0003 "Overallocation Is Prohibited" — the trigger fires
    // regardless of which role performs the write, so an authenticated-
    // JWT insert (not just the trusted server connection) is rejected too.
    it("the goal_allocations_no_overallocation trigger rejects an over-allocating insert even as the authenticated role", async () => {
      await expectDenied(
        withRollback(db, async (tx) => {
          const [goalA] = await tx
            .insert(goals)
            .values({ ownerId: USER_A_ID, title: "Emergency Fund", targetAmount: "5000.00", goalType: "emergency-fund" })
            .returning();
          const [goalA2] = await tx
            .insert(goals)
            .values({ ownerId: USER_A_ID, title: "Vacation Fund", targetAmount: "2000.00", goalType: "vacation" })
            .returning();
          const [accountA] = await tx
            .insert(accounts)
            .values({ ownerId: USER_A_ID, name: "Savings", accountType: "savings", currentBalance: "1000.00" })
            .returning();
          await tx.insert(goalAllocations).values({ ownerId: USER_A_ID, goalId: goalA.id, accountId: accountA.id, amount: "700.00" });

          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx.insert(goalAllocations).values({ ownerId: USER_A_ID, goalId: goalA2.id, accountId: accountA.id, amount: "500.00" });
        }),
        /goal_allocations_overallocation/,
      );
    });
  });

  describe("account_balance_snapshots", () => {
    it("User A can read own snapshots but not User B's", async () => {
      await withRollback(db, async (tx) => {
        const [accountA] = await tx
          .insert(accounts)
          .values({ ownerId: USER_A_ID, name: "Checking", accountType: "checking", currentBalance: "1000.00" })
          .returning();
        const [snapshotA] = await tx
          .insert(accountBalanceSnapshots)
          .values({
            ownerId: USER_A_ID,
            accountId: accountA.id,
            snapshotDate: "2026-01-31",
            balance: "1000.00",
            accountType: "checking",
            balanceSource: "manual",
          })
          .returning();

        const [accountB] = await tx
          .insert(accounts)
          .values({ ownerId: USER_B_ID, name: "Checking", accountType: "checking", currentBalance: "500.00" })
          .returning();
        const [snapshotB] = await tx
          .insert(accountBalanceSnapshots)
          .values({
            ownerId: USER_B_ID,
            accountId: accountB.id,
            snapshotDate: "2026-01-31",
            balance: "500.00",
            accountType: "checking",
            balanceSource: "manual",
          })
          .returning();

        await runAsAuthenticatedUser(tx, USER_A_ID);
        const own = await tx.select().from(accountBalanceSnapshots).where(eq(accountBalanceSnapshots.id, snapshotA.id));
        const other = await tx.select().from(accountBalanceSnapshots).where(eq(accountBalanceSnapshots.id, snapshotB.id));

        expect(own).toHaveLength(1);
        expect(other).toHaveLength(0);
      });
    });

    it("User A can insert a snapshot with owner_id = self", async () => {
      await withRollback(db, async (tx) => {
        const [accountA] = await tx
          .insert(accounts)
          .values({ ownerId: USER_A_ID, name: "Checking", accountType: "checking", currentBalance: "1000.00" })
          .returning();

        await runAsAuthenticatedUser(tx, USER_A_ID);
        const [row] = await tx
          .insert(accountBalanceSnapshots)
          .values({
            ownerId: USER_A_ID,
            accountId: accountA.id,
            snapshotDate: "2026-01-31",
            balance: "1000.00",
            accountType: "checking",
            balanceSource: "manual",
          })
          .returning();
        expect(row.ownerId).toBe(USER_A_ID);
      });
    });

    it("User A cannot insert a snapshot owned by User B (cross-owner snapshot IDs fail closed)", async () => {
      await expectDenied(
        withRollback(db, async (tx) => {
          const [accountB] = await tx
            .insert(accounts)
            .values({ ownerId: USER_B_ID, name: "Checking", accountType: "checking", currentBalance: "500.00" })
            .returning();

          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx.insert(accountBalanceSnapshots).values({
            ownerId: USER_B_ID,
            accountId: accountB.id,
            snapshotDate: "2026-01-31",
            balance: "500.00",
            accountType: "checking",
            balanceSource: "manual",
          });
        }),
        /row-level security/,
      );
    });

    // No UPDATE grant exists at all — this table is genuinely immutable
    // (see the migration), unlike goal_allocations' partial UPDATE(amount)
    // grant. Even a self-owned row's own balance can never be rewritten.
    it("User A cannot update their own snapshot's balance — no UPDATE grant exists at all", async () => {
      await expectDenied(
        withRollback(db, async (tx) => {
          const [accountA] = await tx
            .insert(accounts)
            .values({ ownerId: USER_A_ID, name: "Checking", accountType: "checking", currentBalance: "1000.00" })
            .returning();
          const [snapshotA] = await tx
            .insert(accountBalanceSnapshots)
            .values({
              ownerId: USER_A_ID,
              accountId: accountA.id,
              snapshotDate: "2026-01-31",
              balance: "1000.00",
              accountType: "checking",
              balanceSource: "manual",
            })
            .returning();

          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx
            .update(accountBalanceSnapshots)
            .set({ balance: "9999999.00" })
            .where(eq(accountBalanceSnapshots.id, snapshotA.id));
        }),
        /permission denied/,
      );
    });

    // No DELETE grant either — matches net-worth-model.md §19 ("Athena
    // must never modify historical snapshots"); unlike every other owned
    // table in this schema there is no soft-delete escape hatch here.
    it("User A cannot delete their own snapshot — no DELETE grant, no ordinary hard-delete path", async () => {
      await expectDenied(
        withRollback(db, async (tx) => {
          const [accountA] = await tx
            .insert(accounts)
            .values({ ownerId: USER_A_ID, name: "Checking", accountType: "checking", currentBalance: "1000.00" })
            .returning();
          const [snapshotA] = await tx
            .insert(accountBalanceSnapshots)
            .values({
              ownerId: USER_A_ID,
              accountId: accountA.id,
              snapshotDate: "2026-01-31",
              balance: "1000.00",
              accountType: "checking",
              balanceSource: "manual",
            })
            .returning();

          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx.delete(accountBalanceSnapshots).where(eq(accountBalanceSnapshots.id, snapshotA.id));
        }),
        /permission denied/,
      );
    });

    it("the unique (account_id, snapshot_date) index rejects a duplicate insert, even as the authenticated role", async () => {
      await expectDenied(
        withRollback(db, async (tx) => {
          const [accountA] = await tx
            .insert(accounts)
            .values({ ownerId: USER_A_ID, name: "Checking", accountType: "checking", currentBalance: "1000.00" })
            .returning();

          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx.insert(accountBalanceSnapshots).values({
            ownerId: USER_A_ID,
            accountId: accountA.id,
            snapshotDate: "2026-01-31",
            balance: "1000.00",
            accountType: "checking",
            balanceSource: "manual",
          });
          await tx.insert(accountBalanceSnapshots).values({
            ownerId: USER_A_ID,
            accountId: accountA.id,
            snapshotDate: "2026-01-31",
            balance: "1050.00",
            accountType: "checking",
            balanceSource: "manual",
          });
        }),
        /duplicate key value violates unique constraint/,
      );
    });
  });

  // 0004_harden_owned_table_update_grants.sql: column-level UPDATE grants
  // reinforce the RLS WITH CHECK at a level RLS can't reach (row-scoped,
  // not column-scoped) — id/owner_id/created_at/updated_at/deleted_at are
  // not grantee-writable at all, independent of what any policy allows.
  describe("column-level UPDATE hardening on owned tables", () => {
    it("User A cannot update accounts.id or accounts.deleted_at even on their own row", async () => {
      await expectDenied(
        withRollback(db, async (tx) => {
          const [accountA] = await tx
            .insert(accounts)
            .values({ ownerId: USER_A_ID, name: "A Checking", accountType: "checking" })
            .returning();
          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx.update(accounts).set({ id: randomUUID() }).where(eq(accounts.id, accountA.id));
        }),
        /permission denied/,
      );
      await expectDenied(
        withRollback(db, async (tx) => {
          const [accountA] = await tx
            .insert(accounts)
            .values({ ownerId: USER_A_ID, name: "A Checking", accountType: "checking" })
            .returning();
          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx.update(accounts).set({ deletedAt: new Date() }).where(eq(accounts.id, accountA.id));
        }),
        /permission denied/,
      );
    });

    it("User A cannot update categories.id or categories.deleted_at even on their own row", async () => {
      await expectDenied(
        withRollback(db, async (tx) => {
          const [categoryA] = await tx.insert(categories).values({ ownerId: USER_A_ID, name: "Housing" }).returning();
          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx.update(categories).set({ deletedAt: new Date() }).where(eq(categories.id, categoryA.id));
        }),
        /permission denied/,
      );
    });

    it("User A cannot update transactions.id or transactions.deleted_at even on their own row", async () => {
      await expectDenied(
        withRollback(db, async (tx) => {
          const [accountA] = await tx
            .insert(accounts)
            .values({ ownerId: USER_A_ID, name: "A Checking", accountType: "checking" })
            .returning();
          const [txnA] = await tx
            .insert(transactions)
            .values({
              ownerId: USER_A_ID,
              accountId: accountA.id,
              transactionDate: "2026-08-01",
              originalDescription: "A TXN",
              amount: "-10.00",
              transactionType: "expense",
            })
            .returning();
          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx.update(transactions).set({ deletedAt: new Date() }).where(eq(transactions.id, txnA.id));
        }),
        /permission denied/,
      );
    });

    it("User A cannot update data_provider_connections.id or .deleted_at even on their own row", async () => {
      await expectDenied(
        withRollback(db, async (tx) => {
          const [connA] = await tx
            .insert(dataProviderConnections)
            .values({ ownerId: USER_A_ID, providerName: "manual" })
            .returning();
          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx.update(dataProviderConnections).set({ deletedAt: new Date() }).where(eq(dataProviderConnections.id, connA.id));
        }),
        /permission denied/,
      );
    });

    it("User A cannot update budget_periods.id or .deleted_at even on their own row", async () => {
      await expectDenied(
        withRollback(db, async (tx) => {
          const [periodA] = await tx
            .insert(budgetPeriods)
            .values({ ownerId: USER_A_ID, periodStart: "2026-08-01", periodEnd: "2026-08-31" })
            .returning();
          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx.update(budgetPeriods).set({ deletedAt: new Date() }).where(eq(budgetPeriods.id, periodA.id));
        }),
        /permission denied/,
      );
    });

    it("User A cannot update budget_allocations.id or .deleted_at even on their own row", async () => {
      await expectDenied(
        withRollback(db, async (tx) => {
          const [periodA] = await tx
            .insert(budgetPeriods)
            .values({ ownerId: USER_A_ID, periodStart: "2026-08-01", periodEnd: "2026-08-31" })
            .returning();
          const [categoryA] = await tx.insert(categories).values({ ownerId: USER_A_ID, name: "Groceries" }).returning();
          const [allocationA] = await tx
            .insert(budgetAllocations)
            .values({ ownerId: USER_A_ID, budgetPeriodId: periodA.id, categoryId: categoryA.id, plannedAmount: "500.00" })
            .returning();
          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx.update(budgetAllocations).set({ deletedAt: new Date() }).where(eq(budgetAllocations.id, allocationA.id));
        }),
        /permission denied/,
      );
    });

    it("legitimate mutable columns remain updatable (accounts.name)", async () => {
      await withRollback(db, async (tx) => {
        const [accountA] = await tx
          .insert(accounts)
          .values({ ownerId: USER_A_ID, name: "A Checking", accountType: "checking" })
          .returning();
        await runAsAuthenticatedUser(tx, USER_A_ID);
        const [row] = await tx.update(accounts).set({ name: "Renamed" }).where(eq(accounts.id, accountA.id)).returning();
        expect(row.name).toBe("Renamed");
      });
    });
  });

  describe("institutions", () => {
    it("authenticated users can read institutions", async () => {
      await withRollback(db, async (tx) => {
        const [institution] = await tx.insert(institutions).values({ name: "Test Bank RLS" }).returning();

        await runAsAuthenticatedUser(tx, USER_A_ID);
        const rows = await tx.select().from(institutions).where(eq(institutions.id, institution.id));
        expect(rows).toHaveLength(1);
      });
    });

    it("authenticated users cannot insert institutions", async () => {
      await expectDenied(
        withRollback(db, async (tx) => {
          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx.insert(institutions).values({ name: "Rogue Bank" });
        }),
        /permission denied/,
      );
    });

    it("authenticated users cannot update institutions", async () => {
      await expectDenied(
        withRollback(db, async (tx) => {
          const [institution] = await tx.insert(institutions).values({ name: "Test Bank RLS" }).returning();
          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx.update(institutions).set({ name: "Hijacked" }).where(eq(institutions.id, institution.id));
        }),
        /permission denied/,
      );
    });

    it("authenticated users cannot delete institutions", async () => {
      await expectDenied(
        withRollback(db, async (tx) => {
          const [institution] = await tx.insert(institutions).values({ name: "Test Bank RLS" }).returning();
          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx.delete(institutions).where(eq(institutions.id, institution.id));
        }),
        /permission denied/,
      );
    });
  });
});
