# financial-operating-system
A secure personal finance platform for transaction management, budgeting, debt payoff, net worth tracking, and financial automation.

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
