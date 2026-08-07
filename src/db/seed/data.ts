import { accountFixtures } from "./fixtures/accounts";
import { categoryChildFixtures, categoryParentFixtures } from "./fixtures/categories";
import { connectionFixtures } from "./fixtures/connections";
import { institutionFixtures } from "./fixtures/institutions";
import { buildTransactions } from "./fixtures/transactions";

// Thin orchestrator only — every row's actual shape lives in
// fixtures/*.ts (static institutions/categories/accounts/connections) and
// fixtures/transactions/*.ts (the four transaction generators: recurring,
// variable-spending, transfers, edge-cases). Nothing about "what a
// realistic household's data looks like" belongs in this file; it exists
// purely to hand seed/index.ts one ownerId-scoped bundle to insert.
//
// public.users rows are never seeded directly here — that row is created
// exclusively by the handle_new_user trigger when a real Supabase Auth
// user signs up (see src/db/migrations/0002_handle_new_user_trigger.sql).
export function buildDevData(ownerId: string) {
  return {
    devInstitutions: institutionFixtures,
    devParentCategories: categoryParentFixtures(ownerId),
    devChildCategories: categoryChildFixtures(ownerId),
    devAccounts: accountFixtures(ownerId),
    devTransactions: buildTransactions(ownerId),
    devDataProviderConnections: connectionFixtures(ownerId),
  };
}

// Re-exported for callers (tests, verification scripts) that want a given
// owner's fixture ids without importing every fixtures/* module
// individually. Every one of these is now owner-scoped (see
// deterministic.ts's fixtureId) — call with the owner in question rather
// than reading a bare constant.
export { accountIds, type AccountIds } from "./fixtures/accounts";
export { categoryGroups, categoryIdByName } from "./fixtures/categories";
export { connectionIds, type ConnectionIds } from "./fixtures/connections";
// Institutions are the one genuinely global, unscoped table — every owner
// shares the same three rows, so these stay bare constants.
export { INSTITUTION_CASCADE_ID, INSTITUTION_HARBOR_ID, INSTITUTION_MERIDIAN_ID } from "./fixtures/institutions";
