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

This attaches the synthetic dev dataset (accounts, categories, transactions) to your real signed-up user. Seeding never touches `public.users` or `auth.users` itself, and never uses a fabricated or production-style identity.

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

To run the same checks CI runs, locally, before pushing:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```
