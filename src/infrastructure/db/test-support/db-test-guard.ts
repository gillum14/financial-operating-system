// The gate every DB-backed integration test file must check before doing
// anything with a real database connection.
//
// Added after a real incident (2026-08-06): running the full test suite
// with DATABASE_URL set wiped every row from accounts, transactions,
// data_provider_connections, and categories on the shared dev Supabase
// project — reproducible only when multiple DB-backed test files ran
// concurrently (vitest's default parallel-file execution), never when run
// individually. The exact PgBouncer transaction-pooler mechanism was never
// confirmed (see docs/testing.md § Data-loss incident for the full
// writeup) — this guard and the sequential-execution requirement are the
// mitigation, not a fix for a root cause that was never pinned down.
//
// Three independent things must all be true before a DB-backed test may
// run:
//   1. ALLOW_DB_TESTS=true — an explicit, unmissable opt-in. Nothing here
//      infers "looks like a test run" from context; a human (or a CI job
//      someone deliberately configured) must set this.
//   2. TEST_DATABASE_URL is set — DB-backed tests use this, never
//      DATABASE_URL, even if DATABASE_URL happens to be present. There is
//      no fallback: an unset TEST_DATABASE_URL refuses, full stop, rather
//      than silently reusing the pooled application connection.
//   3. If TEST_DATABASE_URL and DATABASE_URL are byte-for-byte identical,
//      that alone must not be enough to proceed — it means no separate
//      test database is configured, which is exactly the shape of the
//      2026-08-06 incident. A second explicit variable,
//      ALLOW_DB_TESTS_AGAINST_DEV_DATABASE=true, is required to accept
//      that risk knowingly. This is a string comparison of the two full
//      connection strings, not hostname pattern-matching — a "looks like
//      prod/dev" heuristic on the hostname would be trivially wrong for
//      any project whose naming doesn't match the assumption.
export interface DbTestGuardResult {
  allowed: boolean;
  reason?: string;
  connectionString?: string;
}

export type DbTestGuardEnv = Record<string, string | undefined>;

export function evaluateDbTestGuard(env: DbTestGuardEnv = process.env): DbTestGuardResult {
  if (env.ALLOW_DB_TESTS !== "true") {
    return {
      allowed: false,
      reason:
        "ALLOW_DB_TESTS is not set to 'true'. DB-backed tests are opt-in only — run `npm run test:db` " +
        "(or `npm run test:full`), or see docs/testing.md for the full safeguard requirements.",
    };
  }

  const testDatabaseUrl = env.TEST_DATABASE_URL;
  if (!testDatabaseUrl) {
    return {
      allowed: false,
      reason:
        "TEST_DATABASE_URL is not set. DB-backed tests never fall back to DATABASE_URL (the pooled application " +
        "connection) — set TEST_DATABASE_URL explicitly. See .env.example and docs/testing.md.",
    };
  }

  if (testDatabaseUrl === env.DATABASE_URL && env.ALLOW_DB_TESTS_AGAINST_DEV_DATABASE !== "true") {
    return {
      allowed: false,
      reason:
        "TEST_DATABASE_URL is identical to DATABASE_URL — no separate test database is configured. This is the " +
        "exact shape of the 2026-08-06 data-loss incident (see docs/testing.md). If you understand the risk and " +
        "have no separate test database available, set ALLOW_DB_TESTS_AGAINST_DEV_DATABASE=true to proceed anyway.",
    };
  }

  return { allowed: true, connectionString: testDatabaseUrl };
}
