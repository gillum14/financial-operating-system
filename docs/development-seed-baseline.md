# Development seed baseline

**Established:** 2026-08-06 (re-established after the data-loss incident
documented in [`docs/testing.md`](./testing.md) wiped the prior baseline).

This is the canonical, verified state of the dev Supabase project's
seed-owned tables. If these counts ever drift unexpectedly, something
touched data outside the normal `npm run db:seed` / app-usage path — see
`docs/testing.md` for how the last unexpected drift happened and what
guards against it now.

## Seed owner

**Canonical development identity as of 2026-08-07:**

- **Email:** `caitlingillum.athena.dev@gmail.com` (an address the account
  owner actually controls — see "Retired seed owner" below for why this
  replaced the original one)
- **User ID:** `7a02431b-b4fb-4e30-a77f-e0cc8ddbad5a`
- Created through the normal `/signup` flow (`supabase.auth.signUp()`, not
  a direct row insert) and confirmed through a real inbox — no out-of-band
  database edit was needed or used for this account.
- Set as `SEED_OWNER_ID` in `.env.local`.

This is a distinct identity from `SUPABASE_TEST_USER_A`/`SUPABASE_TEST_USER_B`
(used only for RLS test simulation) — it exists purely to own the seed
dataset.

### Retired seed owner

`caitlingillum+athena-dev@gmail.com` (id `2d2c216c-ec01-491f-a795-
2f4f2539b58e`) was the original seed owner, established 2026-08-06. It was
retired on 2026-08-07 because that address turned out not to be one the
account owner actually controls, and replaced with the account above.

**Its dataset was left in place — nothing was deleted or migrated.** Every
fixture id is owner-scoped (see "Owner-scoped fixture ids" below), so the
new owner received its own fully independent sandbox rather than
inheriting or colliding with the retired owner's rows. The retired
account's auth record and data are untouched pending a future decision on
whether to remove them; see the row-count table below for what it still
holds.

## Owner-scoped fixture ids (multiple seed owners)

Every fixture row id is derived from `fixtureId(ownerId, name, legacyId?)`
(see [`src/db/seed/deterministic.ts`](../src/db/seed/deterministic.ts)),
**not** a bare `deterministicId(name)` — so two different owners running
`npm run db:seed` each get a fully independent dataset instead of colliding
on primary keys:

- For `LEGACY_SEED_OWNER_ID` (`2d2c216c-...`, the retired owner above) —
  `fixtureId` returns exactly the id that owner's rows already have in the
  database: the `legacyId` literal when one is supplied (the three original
  hand-typed accounts/five categories/one connection/two institutions
  predating the sandbox expansion), or `deterministicId(name)` with no
  owner component otherwise (everything the sandbox expansion generated
  before the owner switch). This is what keeps `npm run db:seed` a true
  no-op on rerun for that one retired owner — changing its formula would
  make every already-seeded row's "new" id differ from what's in the
  database, producing logical duplicates instead of `onConflictDoNothing`
  skips. This branch exists purely for backward compatibility with rows
  already in the database; the canonical owner above never hits it.
- For any other owner, `fixtureId` returns `deterministicId(\`${ownerId}:${name}\`)`
  — a completely different UUID, even for "the same" fixture (both owners'
  checking account, both owners' "Groceries" category, etc.) — so a second
  (or third, or Nth) seed owner can coexist with the legacy owner and with
  each other, each fully idempotent under repeated `npm run db:seed` runs.

Institutions are the one deliberately global, unscoped table (no `ownerId`
column exists on `institutions` at all) — every seed owner references the
same three institution rows rather than getting its own copies.

See [`src/db/seed/data.test.ts`](../src/db/seed/data.test.ts)'s
"owner-scoped fixture ids" test block for the properties this guarantees:
same owner + same key → same id; different owners → different ids; the
legacy owner's literal ids are preserved verbatim; two owners' full
datasets never collide; institutions are shared, not duplicated; and a
non-legacy owner is just as idempotent on rerun as the legacy one.

## Baseline row counts

**Refreshed 2026-08-07** as part of the Net Worth calculation
canonicalization work — the prior table (also dated 2026-08-07, from the
seed-owner switch) predated the Budgets, Goals, and Net Worth History
slices entirely and had drifted stale. Recorded directly from the live
dev Supabase project, re-verified identical after a repeat `npm run
db:seed` run (idempotency) and after a full `npm run test:full` run (see
"Verifying the baseline hasn't drifted" below).

| Table | Canonical owner (`7a02431b-...`) | Retired owner (`2d2c216c-...`) | RLS test user A (`10000000-...a`) | RLS test user B (`10000000-...b`) | Total (all owners) |
| --- | --- | --- | --- | --- | --- |
| `institutions` (shared, no `owner_id`) | 3 | 3 | 3 | 3 | 3 |
| `categories` | 48 | 47 | 0 | 0 | 95 |
| `accounts` | 12 | 12 | 0 | 0 | 24 |
| `transactions` | 1,120 | 1,130 | 0 | 0 | 2,250 |
| `data_provider_connections` | 2 | 2 | 0 | 0 | 4 |
| `budget_periods` | 2 | 0 | 0 | 0 | 2 |
| `budget_allocations` | 19 | 0 | 0 | 0 | 19 |
| `budget_allocation_adjustments` | 2 | 0 | 0 | 0 | 2 |
| `goals` | 23 | 0 | 0 | 0 | 23 |
| `goal_contributions` | 68 | 0 | 0 | 0 | 68 |
| `goal_allocations` | 6 | 0 | 0 | 0 | 6 |
| `account_balance_snapshots` | 144 | 0 | 0 | 0 | 144 |
| `users` (public) / `auth.users` | — | — | — | — | 4 |

Institutions are shared across every owner (see "Owner-scoped fixture ids"
above), so they're not additive — 3 total, not 3+3+3+3.

The retired owner's `transactions` count (1,130) is 10 higher than the
canonical owner's (1,120): those 10 rows are the very original minimal
seed transactions from before the sandbox expansion, which only ever
existed for that one owner and were never regenerated for the new owner
(the sandbox generators fully superseded them going forward). The retired
owner predates Budgets, Goals, and Net Worth History entirely, hence zero
rows in every table those slices introduced.

`users`/`auth.users` total = 4: the canonical seed owner, the retired seed
owner (left in place, not deleted — see "Retired seed owner" above; this
branch does not delete it either), and the two persistent RLS test
identities (`SUPABASE_TEST_USER_A`/`B`), which exist independently of
seeding.

### Fixture counts vs. actual row counts: the canonical owner is a *used* account, not a static snapshot

Running `npm run db:seed` today inserts exactly what `buildDevData()`
currently defines for the canonical owner: 48 categories, 12 accounts,
1,120 transactions, 2 connections, 2 budget periods, **17** budget
allocations, **8** goals, **62** goal contributions, **4** goal
allocations, and 144 net worth snapshots (see the script's own "Seeded
N ..." log lines). Everything above that — currently **+2** budget
allocations, **+15** goals, **+6** goal contributions, and **+2** goal
allocations relative to the fixture counts — is real data the canonical
owner's account has accumulated through actual application usage (real
Server Actions through the real UI), not something `npm run db:seed`
produced or something to "fix":

- 15 of the 23 goals are `archived` Playwright/manual QA test goals
  (titled `Playwright Test Goal ...` / `Debug ... Test ...`, all created
  2026-08-07) — leftover artifacts of live end-to-end testing against
  this account in an earlier session, not part of the deterministic
  fixture set. They carry 2 goal contributions and 2 goal allocations
  between them. The 8 real fixture goals (House Down Payment, Debt
  Payoff, Emergency Fund, Home Renovation Fund, Roth IRA Contribution,
  Wedding Fund, Vacation Fund, College Fund) are unaffected and still
  match the fixture file exactly.
- The remaining small deltas (budget allocations, a few goal
  contributions) are ordinary incidental edits from the same kind of
  live testing.

**This is expected, not drift to reconcile.** `npm run db:seed`'s
idempotency guarantee is "the fixture rows always exist," not "the
account's row counts never grow" — a real, used development account is
expected to accumulate additional real rows over time. Per this branch's
scope guardrails, none of this accumulated data was deleted or migrated;
it was only measured and documented here so the *actual* current baseline
is what future drift-checks compare against, not the smaller fixture-only
counts a fresh `npm run db:seed` alone would produce.

`categories` total (95) = 48 (canonical owner) + 47 (retired owner). (The
canonical owner's own category fixture count grew from 47 to 48 categories
between the prior baseline and this one, as part of ordinary category-
fixture development — not related to this branch's Net Worth work.)

**Correction (Confidence Insights V1, 2026-08-07):** the previous baseline
recorded 5 categories belonging to `SUPABASE_TEST_USER_A`, created through
earlier live UI testing. During this branch's live-verification cleanup,
an overly broad `DELETE ... WHERE owner_id = ...` (intended only to remove
that session's own temporary verification category) removed all of that
owner's categories, including those 5 pre-existing ones. They were test/
RLS fixtures, not real user financial data, and are not recoverable (no
record of their original names/colors existed outside the database). This
is disclosed here rather than silently reflected in a lower row count —
the baseline above now reflects genuine current reality, and this note
exists so a future reader doesn't mistake the drop for an unexplained
anomaly. Lesson applied going forward: any cleanup of temporarily-inserted
verification data must delete by specific row id, never by a shared
`owner_id` that could also match pre-existing, non-owned-by-this-session
rows.

## Reproducing this baseline

```bash
npm run dev
# visit http://localhost:3000/signup, create an account, confirm the email
# find the new user's id: Supabase dashboard -> Authentication -> Users
# set SEED_OWNER_ID in .env.local to that id
npm run db:seed
```

`npm run db:seed` is idempotent (every seeded row has a fixed id) — running
it again against an already-seeded owner is a no-op, not a duplicate
insert.

## Verifying the baseline hasn't drifted

```bash
npm run test:full
```

`npm run test:full` (unit tests + `test:db`) never writes to the canonical
owner's data: DB-backed repository/RLS tests run inside a rolled-back
transaction (`withRollback`) or a separately-connected, independently
cleaned-up race test against a fresh random owner; the composition-root
integration tests (`net-worth-composition.test.ts`,
`dashboard-net-worth-consistency.test.ts`, etc.) are read-only queries
against `SEED_OWNER_ID`. Row counts across every table above should
therefore be **exactly identical** before and after running it — verified
for this refresh by re-querying every table in the row-count section
immediately after a full `npm run test:full` run.

If they aren't identical, stop and investigate before continuing — see
`docs/testing.md`'s incident writeup for what "don't assume it's fine"
looks like in practice. Note the distinction from "Fixture counts vs.
actual row counts" above: re-running `npm run db:seed` is expected to
leave goals/budget_allocations/goal_contributions/goal_allocations
unchanged too (idempotent), but comparing against a *fresh* `npm run
db:seed` on a brand-new owner will legitimately show fewer rows in those
four tables than the canonical owner has — that's the accumulated live-
testing data described above, not seed-script drift.
