# Testing — Operational Guide

This document covers how to actually run tests in this repo, and the
safeguards around DB-backed tests specifically. For the aspirational
testing philosophy/architecture, see
[`docs/architecture/testing-architecture.md`](./architecture/testing-architecture.md).

---

## Commands

| Command | What it runs | Touches a real database? |
| --- | --- | --- |
| `npm test` | Every unit/component/application test | No — DB-gated files self-skip |
| `npm run test:db` | Only the DB-backed integration tests, sequentially | Yes — requires the opt-in below |
| `npm run test:full` | `test` then `test:db` | Yes (the second half) |

`npm test` is always safe to run with no setup: every DB-backed test file
checks the guard described below before doing anything, and `describe.skipIf`s
itself out when the guard refuses — which it does by default, with zero
environment variables set.

`npm run test:db` and `npm run test:full` require `TEST_DATABASE_URL` to be
set in `.env.local` (see `.env.example`) and run vitest with
`--no-file-parallelism`, so DB-backed files execute one at a time, never
concurrently.

### Running a single DB-backed file directly

If you bypass the npm scripts and invoke vitest yourself against a
DB-gated file, you must still supply the same environment — the guard is
enforced inside the test files, not just by the npm script wrapper:

```bash
ALLOW_DB_TESTS=true node --env-file=.env.local node_modules/.bin/vitest run --no-file-parallelism src/infrastructure/db/categories-repository.test.ts
```

Omitting `--no-file-parallelism` when running more than one DB-backed file
at once is not recommended — see the incident below.

---

## The DB-test guard

Every DB-backed test file calls `isDbTestingAllowed()`
(`src/infrastructure/db/test-support/db-test-guard.ts`) instead of the old
ad-hoc `Boolean(process.env.DATABASE_URL)` check. Three things must all be
true:

1. **`ALLOW_DB_TESTS=true`** — an explicit, unmissable opt-in. Nothing
   infers "this looks like a test run" from context.
2. **`TEST_DATABASE_URL` is set** — DB-backed tests use this connection,
   never `DATABASE_URL`. There is no fallback. An unset `TEST_DATABASE_URL`
   refuses outright.
3. **If `TEST_DATABASE_URL` equals `DATABASE_URL` exactly**, a third
   variable, **`ALLOW_DB_TESTS_AGAINST_DEV_DATABASE=true`**, is also
   required. This is a straight string comparison of the two full
   connection strings — not hostname pattern-matching ("does this look
   like prod/dev") — deliberately, since a heuristic like that is
   trivially wrong for any project whose naming doesn't match the
   assumption.

If any of these fail, the guard returns a reason string and the relevant
`describe` block skips entirely — no connection is ever opened.

One file, `src/composition/dashboard-composition.test.ts`, is a documented
exception: it exercises the app's real composition root, which internally
imports `@/db/client` (i.e. `DATABASE_URL`) no matter what. It's still
gated behind the same `ALLOW_DB_TESTS` check, and it is read-only (wires a
singleton, reads a snapshot) — no write risk. Similarly,
`src/lib/supabase/rls-policies.jwt.test.ts` makes its primary Data API
calls against whatever project `NEXT_PUBLIC_SUPABASE_URL` points at (there
is no swappable "test" project for a real JWT sign-in flow), but its
cleanup step uses the trusted `DATABASE_URL` connection directly and is
gated the same way.

---

## Preferring a direct (non-pooled) connection

`MIGRATION_DATABASE_URL`, when set, is used by `npm run db:generate` /
`npm run db:migrate` instead of `DATABASE_URL` (see `drizzle.config.ts`).
Migrations are administrative DDL and are better run over a direct,
non-pooled connection (typically port 5432) than through the app's pooled
PgBouncer connection (`DATABASE_URL`, port 6543 on this project). This is
optional — unset, migrations behave exactly as before.

The same preference applies to `TEST_DATABASE_URL`: point it at a direct
connection when one is reachable from your environment. For this project,
`db.<project-ref>.supabase.co:5432` (username `postgres`, not the
pooler's `postgres.<project-ref>`) was confirmed reachable and working
from the environment this repo's automated verification ran in — this
avoids PgBouncer transaction-pooling entirely for DB-backed tests, which
is exactly the risk class the original (later ruled out — see below)
concurrency hypothesis was about. `TEST_DATABASE_URL` in `.env.local` uses
this direct connection.

It is still the same underlying database as `DATABASE_URL` — no second
Supabase project is provisioned for this repo — so
`ALLOW_DB_TESTS_AGAINST_DEV_DATABASE=true` is set anyway, even though the
guard's identical-string check wouldn't strictly require it (the direct
URL and the pooled URL are different strings). The guard cannot reliably
detect "different connection string, same project" without hostname
pattern-matching, which is exactly what it was told not to rely on — this
is a known gap in the automated check. If you set up a `TEST_DATABASE_URL`
for this project, treat "is this really a separate database, or just a
different path to the same one" as something you still have to judge
yourself.

---

## Data-loss incident (2026-08-06)

### What happened

Running the full test suite with `DATABASE_URL` set (`node
--env-file=.env.local vitest run`, with no other flags) wiped every row
from `accounts`, `transactions`, `data_provider_connections`, and
`categories` on the shared dev Supabase project. `institutions` and
`users`/`auth.users` were untouched.

### Investigation

Every DB-backed test file was reviewed and run individually against the
(by-then-empty) database — all were clean in isolation. The full suite was
re-run and reproduced further loss (a category row created during manual
verification went from present to gone). A 4-file concurrent subset did
not reproduce further loss. This initially pointed toward a suspected
interaction between vitest's default parallel file execution (one process
per test file) and Supabase's PgBouncer transaction-mode pooler
(`DATABASE_URL` uses port 6543) — plausible, but never confirmed at the
PgBouncer level, and recorded as an open question.

### Root cause (confirmed)

A seventh DB-backed file, `src/lib/supabase/rls-policies.jwt.test.ts`, was
missed in the initial file-by-file sweep (an earlier grep for
`hasDatabase`/`DATABASE_URL` patterns didn't surface it). Its `afterAll`
cleanup hook deleted by **owner ID alone**:

```ts
// Before the fix — deletes everything that owner has, not just the rows
// this test run created:
for (const ownerId of [userAId, userBId]) {
  await db.delete(schema.transactions).where(eq(schema.transactions.ownerId, ownerId));
  await db.delete(schema.dataProviderConnections).where(eq(schema.dataProviderConnections.ownerId, ownerId));
  await db.delete(schema.accounts).where(eq(schema.accounts.ownerId, ownerId));
  await db.delete(schema.categories).where(eq(schema.categories.ownerId, ownerId));
}
```

`userAId`/`userBId` are the real, persistent RLS test users
(`SUPABASE_TEST_USER_A/B`) — the same identities used for local
development and manual verification throughout this project. This cleanup
step ran against the real `DATABASE_URL` connection (not a rollback-scoped
transaction) every time this file's tests executed, and matched every row
those owners had — including real seed data and anything created during
manual/browser verification — not just the handful of fixture rows the
test file itself inserted. The comment above the original code even said
"Best-effort cleanup only... rows this file inserts as User A/B" — the
code just didn't actually scope to that.

This file ran in every "full suite" invocation throughout this project's
history (it matches vitest's `src/**/*.test.ts` include pattern) and is
gated only by its own env vars
(`NEXT_PUBLIC_SUPABASE_URL`/`SUPABASE_TEST_USER_*`), all of which were
present in `.env.local` — so it was never skipped.

**The PgBouncer/concurrency hypothesis above was very likely a red
herring** — this bug alone fully explains the observed wipe (every
affected table matches exactly what this cleanup touched; `institutions`
and `users` were never touched by it, matching what survived). Whether
concurrent DB-backed test execution is *also* independently risky on this
project's PgBouncer pooler was not separately re-tested after fixing this
bug, and remains formally unconfirmed — sequential execution
(`--no-file-parallelism`) is still required as a safeguard regardless,
since it's low-cost and removes that variable entirely.

### Fix

`rls-policies.jwt.test.ts` now tracks the exact IDs it inserts (`trackId()`
helper) and its `afterAll` deletes only those IDs (`inArray(...)`),
never a blanket owner-ID match. See the file for the full change.

### Safeguards added

1. **`db-test-guard.ts`** — the three-part opt-in described above, checked
   by every DB-backed test file.
2. **`test-db-client.ts`** — the one way to obtain a real DB connection in
   a test, always via `TEST_DATABASE_URL` through the guard (except the
   two documented exceptions above).
3. **Sequential execution required** — `npm run test:db` /
   `test:full` always pass `--no-file-parallelism`.
4. **Separate commands** — `test` (never touches a database) vs. `test:db`
   (DB-backed only) vs. `test:full` (both, sequentially).
5. **`MIGRATION_DATABASE_URL`** — optional direct-connection preference for
   migrations, separate from the app's pooled `DATABASE_URL`.
6. **This document** and warnings in `.env.example`.

---

## Live QA fixture safety

A second, related incident (Confidence Insights V1, 2026-08-07) happened
outside the automated test suite entirely: during manual live-QA cleanup —
a real browser session logged in as `SUPABASE_TEST_USER_A`, against the
real dev Supabase database via an ad-hoc Node script — an
`DELETE FROM categories WHERE owner_id = ownerId`, intended to remove one
temporary verification row, deleted 5 unrelated, pre-existing categories
for that same owner. Same root cause as the 2026-08-06 incident above
(scoping a cleanup delete by owner instead of by the exact rows created),
different call site (a one-off ad-hoc script, not a committed test file).
See `docs/development-seed-baseline.md`'s "Correction (Confidence Insights
V1, 2026-08-07)" note for the full writeup.

**`QaFixtureSet`** (`src/infrastructure/db/test-support/qa-fixtures.ts`) is
the structural fix, and is now the *only* sanctioned way to create and
clean up temporary rows during live QA — whether in a DB-backed test file
or in an ad-hoc verification script:

```ts
import { createQaFixtureSet } from "@/infrastructure/db/test-support/qa-fixtures";

const fixtures = createQaFixtureSet(db); // real db, or a test tx
const category = await fixtures.createCategory({ ownerId, name: "Verification Groceries" });
// ...browser-driven verification against `category`...
await fixtures.cleanup(); // deletes exactly this category, nothing else
```

Every `createX()` method (categories, accounts, transactions, goals, goal
contributions, goal allocations, budget periods/allocations/adjustments,
confidence score snapshots, account balance snapshots) records the exact
row it inserted. `trackExisting(table, id)` covers a row created outside
the helper (e.g. through a real server action during a browser session)
that still needs cleanup — it still takes one specific table and one
specific id, never a filter.

**`cleanup()` takes no arguments.** There is no method on `QaFixtureSet`
that accepts an owner id, an email, or any other broad filter — it is not
possible to construct a call through this API that deletes more than what
this instance tracked. `cleanup()` deletes in the exact reverse of
creation/tracking order, which is FK-safe by construction (a row can only
reference something that already exists, so whatever it depends on was
always tracked earlier), and is safe to call more than once — an emptied
or partially-drained ledger is a no-op, and deleting an already-deleted id
is a no-op at the SQL level too.

Any future ad-hoc QA cleanup script should go through `QaFixtureSet`
rather than writing a fresh raw `DELETE ... WHERE owner_id = ...` — that
pattern is exactly what caused both incidents on this page. See
`src/infrastructure/db/test-support/qa-fixtures.test.ts` for the
regression test proving an untracked, same-owner row survives cleanup.

### What remains unconfirmed

- The exact PgBouncer transaction-pooler mechanism suspected before the
  real root cause was found was never independently verified or ruled
  out. It's plausible concurrent DB-backed test execution carries some
  risk on this pooler independent of the bug above; it's also plausible
  the entire original incident was fully explained by the bug and nothing
  else was ever wrong. Sequential execution removes the question rather
  than answering it.
- Whether a genuinely separate test database (a second Supabase project)
  would be reachable and practical for this project hasn't been set up —
  today, `TEST_DATABASE_URL` is the same value as `DATABASE_URL` with the
  explicit override flag, which is safe *given the fix above*, but is not
  the same as true isolation.
