import { db, queryClient } from "../client";
import { accounts, categories, dataProviderConnections, institutions, transactions, users } from "../schema";
import {
  devAccounts,
  devChildCategories,
  devDataProviderConnections,
  devInstitutions,
  devParentCategories,
  devTransactions,
  devUsers,
} from "./data";

// Idempotent: every seed row has a fixed id, so re-running this script only
// ever inserts rows that don't already exist.
async function seed() {
  await db.insert(users).values(devUsers).onConflictDoNothing();
  console.log(`Seeded ${devUsers.length} user(s)`);

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
