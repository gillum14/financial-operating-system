# Development seed baseline

**Established:** 2026-08-06 (re-established after the data-loss incident
documented in [`docs/testing.md`](./testing.md) wiped the prior baseline).

This is the canonical, verified state of the dev Supabase project's
seed-owned tables. If these counts ever drift unexpectedly, something
touched data outside the normal `npm run db:seed` / app-usage path — see
`docs/testing.md` for how the last unexpected drift happened and what
guards against it now.

## Seed owner

A real user created through the normal `/signup` flow (not inserted
directly into the database) on 2026-08-06:

- **Email:** `caitlingillum+athena-dev@gmail.com` (personally controlled
  alias, matching the convention already used for the RLS test users — see
  README's "Row Level Security test users" section)
- **User ID:** `2d2c216c-ec01-491f-a795-2f4f2539b58e`
- Email confirmation was completed by updating `auth.users.email_confirmed_at`
  directly afterward — a stand-in for clicking the confirmation email link
  in an environment with no real inbox access. The account itself was
  created by the real signup flow (`supabase.auth.signUp()`), not by
  inserting a row; only the confirmation step was completed out of band.
- Set as `SEED_OWNER_ID` in `.env.local`.

This is a distinct identity from `SUPABASE_TEST_USER_A`/`SUPABASE_TEST_USER_B`
(used only for RLS test simulation) — it exists purely to own the seed
dataset.

## Baseline row counts

Recorded immediately after `npm run db:seed`, then re-verified identical
after a full `npm run test:full` run (266 unit + 104 DB-backed tests, all
passing):

| Table | Count |
| --- | --- |
| `users` (public) | 3 |
| `auth.users` | 3 |
| `institutions` | 2 |
| `categories` | 8 |
| `accounts` | 3 |
| `transactions` | 10 |
| `data_provider_connections` | 1 |

`users`/`auth.users` = 3: the seed owner above, plus the two persistent
RLS test identities (`SUPABASE_TEST_USER_A`/`B`), which exist independently
of seeding.

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
