# financial-operating-system

A secure personal finance platform for transaction management, budgeting, debt payoff, net worth tracking, and financial automation.

## Core Documentation

- [Athena Canon](CANON.md) — the authoritative source for Athena's governing product, engineering, security, and documentation principles.
- [Engineering Handbook](docs/README.md) — the entry point for architecture, product, implementation, standards, and supporting documentation.

## Local development setup

Copy `.env.example` to `.env.local` and fill in:

- `DATABASE_URL` — your Supabase project's Postgres connection string.
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from Project Settings -> API in the Supabase dashboard.

Run migrations, then sign up a real user through the app and seed dev data against it:

```bash
npm run db:migrate
npm run dev
# visit http://localhost:3000/signup, create an account, confirm the email
```

`public.users` profiles are created exclusively by the `handle_new_user` database trigger when you sign up — there is no way to seed one directly. Once you have a confirmed user, find its id (Supabase dashboard -> Authentication -> Users, or `select id from auth.users`), set `SEED_OWNER_ID` in `.env.local` to that id, and run:

```bash
npm run db:seed
```

This attaches the synthetic dev dataset (accounts, categories, transactions) to your real signed-up user. Seeding never touches `public.users` or `auth.users` itself, and never uses a fabricated or production-style identity. `npm run db:seed` loads `.env.local` itself — if `SEED_OWNER_ID` is missing it prints a guided walkthrough of the steps above rather than a raw error. See [`docs/development-seed-baseline.md`](docs/development-seed-baseline.md) for this project's current verified baseline (row counts per table, the seed owner's id) and how to reproduce or re-verify it.

### Row Level Security test users

`src/infrastructure/db/rls-policies.test.ts` (direct role/claim simulation, needs only `DATABASE_URL`) and `src/lib/supabase/rls-policies.jwt.test.ts` (real JWT round-trip through Supabase Auth + the Data API, needs the anon key too) both verify RLS policy enforcement using two fixed, non-production test identities — User A and User B. Create them once per environment, directly in `auth.users` (there's no signup UI flow needed for test fixtures).

**Two non-obvious requirements, confirmed the hard way against a live project — both matter, not just the `auth.users` insert:**
1. **Email domain**: this project's Auth config rejects `@example.com` outright (`email_address_invalid`) — confirmed by testing both a real signup against `@example.com` (rejected) and `@gmail.com` (accepted). Use aliases you personally control on a real, deliverable domain (e.g. a `+tag` alias on your own address) — nothing is ever actually sent to them, since `email_confirmed_at` is set directly, but the domain itself must pass validation. Don't assume RFC 2606 reserved domains (`example.com`, `example.org`, etc.) will be accepted by every project's validation rules, and don't use an address you don't control.
2. **`auth.identities` row is required**, not just `auth.users` — real signups create both atomically; a manual insert that only populates `auth.users` leaves `signInWithPassword()` failing with an opaque `500 "Database error querying schema"`. `identity_data` must be inserted as a genuine `jsonb` **object**, not a stringified-then-cast value (`sql.json(obj)` in postgres.js — not `JSON.stringify(obj)` cast with `::jsonb`, which produces a jsonb *string* scalar and silently breaks the table's `email` generated column). `confirmation_token`, `recovery_token`, `email_change`, and `email_change_token_new` must be empty strings, not `NULL` — GoTrue fails to scan a `NULL` there and returns the same opaque 500; the schema allows `NULL` (no `NOT NULL` constraint), but GoTrue's own code doesn't handle it.

```sql
-- Run against your dev database.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
) values (
  '00000000-0000-0000-0000-000000000000', '<user-a-uuid>', 'authenticated', 'authenticated',
  '<user-a-email>', crypt('<user-a-password>', gen_salt('bf')),
  now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(),
  '', '', '', ''
);

insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
values (
  '<user-a-uuid>', '<user-a-uuid>',
  jsonb_build_object('sub', '<user-a-uuid>', 'email', '<user-a-email>', 'email_verified', true, 'phone_verified', false),
  'email', now(), now()
);
-- repeat for User B
```

The `handle_new_user` trigger creates the matching `public.users` profile automatically once `auth.users` has the row.

**These identities live only in this non-production dev project** — never create them against a production database. There is no automated cleanup or rotation job; treat them as a long-lived fixture and handle both manually:
- **Rotation**: if a password is ever suspected exposed (e.g. pasted somewhere it shouldn't have been), regenerate it directly (`update auth.users set encrypted_password = crypt('<new-password>', gen_salt('bf')) where id = '<uuid>'`) and update `.env.local` / CI secrets to match. No other cleanup needed — nothing else references the password.
- **Full recreation**: safe at any time — delete the `public.users`, `auth.identities`, and `auth.users` rows (in that order, for the FK) and recreate following the recipe above with fresh credentials. The fixed UUIDs are hardcoded in the test files (`10000000-...-000a` / `...000b`); if you regenerate with different ids, update `USER_A_ID`/`USER_B_ID` in `src/infrastructure/db/rls-policies.test.ts` to match.
- **Before any production cutover of this project**: delete both identities entirely — they must never exist in a database anyone treats as production.

Set `SUPABASE_TEST_USER_A_EMAIL` / `SUPABASE_TEST_USER_A_PASSWORD` / `SUPABASE_TEST_USER_B_EMAIL` / `SUPABASE_TEST_USER_B_PASSWORD` in `.env.local` to match whatever you created. Never use production credentials, and never commit real values for any of these — `.env.local` is gitignored specifically so this is safe to keep there.

### Supabase dashboard configuration checklist

These settings live in the Supabase dashboard, not application code, and must be reviewed manually per environment:

- **Auth rate limits** (Authentication -> Rate Limits) — the primary abuse-prevention layer; the app only provides safe UX around whatever limits are configured here.
- **Email confirmation** (Authentication -> Providers -> Email) — must be enabled; the signup flow assumes it.
- **Redirect URL allowlist** (Authentication -> URL Configuration) — must include `{SITE_URL}/auth/callback` for every environment (local, staging, production).
- **Site URL** (Authentication -> URL Configuration) — must match the app's real production origin before launch; `SITE_URL` in application env vars must match it.
- **CAPTCHA / Turnstile** — not yet configured; required before any public beta.
- **Breached-password protection** — enable if available on the current Supabase plan.
- **MFA** — not implemented in the app yet; readiness for later sensitive-action flows should be reviewed when that work starts.

## Continuous Integration

Every pull request targeting `main`, and every push to `main`, runs the same quality gate defined in [`.github/workflows/ci.yml`](.github/workflows/ci.yml):

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`

Live PostgreSQL integration tests (files gated behind a `DATABASE_URL` check, e.g. `src/infrastructure/db/**/*.test.ts`, `src/composition/dashboard-composition.test.ts`) are **not** part of this workflow. They require a real, migrated, seeded database and skip themselves cleanly — via `describe.skipIf` — when `DATABASE_URL` isn't set, which is the normal state for an untrusted pull-request run. Run them locally against a database you control:

```bash
DATABASE_URL="postgresql://..." npm test
```

`src/lib/supabase/rls-policies.jwt.test.ts` skips independently of `DATABASE_URL` — it's gated on `NEXT_PUBLIC_SUPABASE_ANON_KEY` and the four `SUPABASE_TEST_USER_*` variables instead, since it talks to Supabase's real Auth + Data API rather than the database directly. See "Row Level Security test users" above.

To run the same checks CI runs, locally, before pushing:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```
