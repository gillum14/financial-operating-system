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

**Updated 2026-08-07** after switching the canonical seed owner (see
"Retired seed owner" above). Recorded immediately after `npm run db:seed`
for the new owner, re-verified identical after a second `npm run db:seed`
run (idempotency), and again after a full `npm run test:full` run:

| Table | Canonical owner (`7a02431b-...`) | Retired owner (`2d2c216c-...`) | Total (all owners) |
| --- | --- | --- | --- |
| `institutions` | 3 (shared) | 3 (shared) | 3 |
| `categories` | 47 | 47 | 99 |
| `accounts` | 12 | 12 | 24 |
| `transactions` | 1,120 | 1,130 | 2,250 |
| `data_provider_connections` | 2 | 2 | 4 |
| `users` (public) / `auth.users` | — | — | 4 |

Institutions are shared across every owner (see "Owner-scoped fixture ids"
above), so they're not additive — 3 total either way, not 3+3.

The retired owner's `transactions` count (1,130) is 10 higher than the
canonical owner's (1,120): those 10 rows are the very original minimal
seed transactions from before the sandbox expansion, which only ever
existed for that one owner and were never regenerated for the new owner
(the sandbox generators fully superseded them going forward).

`users`/`auth.users` total = 4: the canonical seed owner, the retired seed
owner (left in place, not deleted), and the two persistent RLS test
identities (`SUPABASE_TEST_USER_A`/`B`), which exist independently of
seeding.

`categories` total (99) = 47 (canonical owner) + 47 (retired owner) + 5
belonging to `SUPABASE_TEST_USER_A` (owner id `10000000-0000-4000-8000-
00000000000a`), created through live UI testing of the Categories feature
earlier in this project's history, not by seeding. That owner's rows are
untouched by the seed script; their presence is expected, not drift.

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

Row counts across the tables above should be identical before and after.
If they aren't, stop and investigate before continuing — see
`docs/testing.md`'s incident writeup for what "don't assume it's fine"
looks like in practice.
