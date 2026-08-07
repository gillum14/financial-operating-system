import { db, queryClient } from "../client";
import {
  accounts,
  budgetAllocations,
  budgetPeriods,
  categories,
  dataProviderConnections,
  institutions,
  transactions,
} from "../schema";
import { buildDevData } from "./data";

// Chunked rather than one INSERT with 1000+ VALUES rows — comfortably
// under any reasonable statement-size/parameter-count limit, and keeps
// each round trip fast. Purely a batching detail: onConflictDoNothing
// still applies per row, so idempotency is unaffected by the chunk size.
const TRANSACTION_INSERT_BATCH_SIZE = 250;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

// Printed as-is (no stack trace, no "Seed failed:" wrapper) — this is an
// expected, well-understood configuration gap, not an unexpected error,
// so it gets a guided walkthrough instead of an exception dump. See
// docs/development-seed-baseline.md for the one-time setup this replaces.
const MISSING_SEED_OWNER_ID_MESSAGE = `❌ No SEED_OWNER_ID configured.

To initialize the development database:

1. Run:
   npm run dev

2. Create an account through Athena.

3. Copy that user's UUID from Supabase.

4. Add:

   SEED_OWNER_ID=<uuid>

   to .env.local

5. Run:

   npm run db:seed

This only needs to be completed once unless the database is intentionally reset.`;

// Idempotent: every seed row has a fixed id, so re-running this script only
// ever inserts rows that don't already exist. public.users is deliberately
// never inserted into here — that row is created exclusively by the
// handle_new_user trigger when SEED_OWNER_ID actually signs up.
async function seed(): Promise<boolean> {
  const ownerId = process.env.SEED_OWNER_ID;
  if (!ownerId) {
    console.error(MISSING_SEED_OWNER_ID_MESSAGE);
    return false;
  }

  const {
    devInstitutions,
    devParentCategories,
    devChildCategories,
    devAccounts,
    devTransactions,
    devDataProviderConnections,
    devBudgetPeriods,
    devBudgetAllocations,
  } = buildDevData(ownerId);

  await db.insert(institutions).values(devInstitutions).onConflictDoNothing();
  console.log(`Seeded ${devInstitutions.length} institution(s)`);

  // Parents before children — child rows reference parentCategoryId.
  await db.insert(categories).values(devParentCategories).onConflictDoNothing();
  await db.insert(categories).values(devChildCategories).onConflictDoNothing();
  console.log(`Seeded ${devParentCategories.length + devChildCategories.length} categories`);

  await db.insert(accounts).values(devAccounts).onConflictDoNothing();
  console.log(`Seeded ${devAccounts.length} account(s)`);

  for (const batch of chunk(devTransactions, TRANSACTION_INSERT_BATCH_SIZE)) {
    await db.insert(transactions).values(batch).onConflictDoNothing();
  }
  console.log(`Seeded ${devTransactions.length} transaction(s)`);

  await db.insert(dataProviderConnections).values(devDataProviderConnections).onConflictDoNothing();
  console.log(`Seeded ${devDataProviderConnections.length} data provider connection(s)`);

  // Periods before allocations — allocations reference budgetPeriodId.
  await db.insert(budgetPeriods).values(devBudgetPeriods).onConflictDoNothing();
  await db.insert(budgetAllocations).values(devBudgetAllocations).onConflictDoNothing();
  console.log(`Seeded ${devBudgetPeriods.length} budget period(s), ${devBudgetAllocations.length} allocation(s)`);

  return true;
}

seed()
  .then((completed) => {
    if (completed) {
      console.log("Seed complete.");
    } else {
      process.exitCode = 1;
    }
  })
  .catch((error: unknown) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await queryClient.end();
  });
