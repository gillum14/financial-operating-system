import { db, queryClient } from "../client";
import { accounts, categories, dataProviderConnections, institutions, transactions } from "../schema";
import { buildDevData } from "./data";

// Idempotent: every seed row has a fixed id, so re-running this script only
// ever inserts rows that don't already exist. public.users is deliberately
// never inserted into here — that row is created exclusively by the
// handle_new_user trigger when SEED_OWNER_ID actually signs up.
async function seed() {
  const ownerId = process.env.SEED_OWNER_ID;
  if (!ownerId) {
    throw new Error(
      "SEED_OWNER_ID is required. Sign up a real user through the app locally (npm run dev, " +
        "visit /signup), then set SEED_OWNER_ID in your .env to that user's id — see README.md.",
    );
  }

  const {
    devInstitutions,
    devParentCategories,
    devChildCategories,
    devAccounts,
    devTransactions,
    devDataProviderConnections,
  } = buildDevData(ownerId);

  await db.insert(institutions).values(devInstitutions).onConflictDoNothing();
  console.log(`Seeded ${devInstitutions.length} institution(s)`);

  // Parents before children — child rows reference parentCategoryId.
  await db.insert(categories).values(devParentCategories).onConflictDoNothing();
  await db.insert(categories).values(devChildCategories).onConflictDoNothing();
  console.log(`Seeded ${devParentCategories.length + devChildCategories.length} categories`);

  await db.insert(accounts).values(devAccounts).onConflictDoNothing();
  console.log(`Seeded ${devAccounts.length} account(s)`);

  await db.insert(transactions).values(devTransactions).onConflictDoNothing();
  console.log(`Seeded ${devTransactions.length} transaction(s)`);

  await db.insert(dataProviderConnections).values(devDataProviderConnections).onConflictDoNothing();
  console.log(`Seeded ${devDataProviderConnections.length} data provider connection(s)`);
}

seed()
  .then(() => {
    console.log("Seed complete.");
  })
  .catch((error: unknown) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await queryClient.end();
  });
