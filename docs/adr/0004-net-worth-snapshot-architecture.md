# ADR-0004: Net Worth Snapshot Architecture

**Project:** Financial Operating System

**Internal Codename:** Athena

**Document Version:** 1.0.0

**Status:** Accepted

**Date:** August 07, 2026

**Owner:** Caitlin Gillum

**Primary Architect:** Caitlin Gillum

**Technical Advisor:** Claude (Anthropic)

---

# Context

Issue #51 requires Athena to show real Net Worth trends, account-level deltas, and time-based
financial progress — none of which are honestly computable from current account balances alone.
`docs/products/net-worth-specification.md` §14 and `docs/financial-model/net-worth-model.md` §13
both describe a hybrid model: current Net Worth stays dynamically calculated from live account
balances, while historical Net Worth comes from immutable, dated snapshots.

Two architectures were considered for what gets snapshotted and stored:

1. **Stored aggregate** — a `net_worth_snapshots` table storing one row per (owner, date) with
   the already-computed totalAssets/totalLiabilities/netWorth baked in at capture time.
2. **Derived from account-level snapshots** — an `account_balance_snapshots` table storing one
   row per (account, date), with Net Worth history computed at read time by running the exact
   same classification logic the current-balance path already uses.

---

# Decision

Athena stores only **account-level balance snapshots** (`account_balance_snapshots`, one row per
account per snapshot date). Net Worth history — totals, deltas, and category breakdowns — is
**derived at read time** from those rows via `computeHistoricalNetWorthBreakdown`, which shares
its core classification logic with the current-balance path (`computeNetWorthBreakdown`) through
a single extracted function (`computeNetWorthBreakdownCore` in `net-worth-breakdown.ts`). There is
no separate stored Net Worth aggregate table.

---

# Rationale

- **Single Source of Truth** (net-worth-model.md §2): a stored aggregate would be a second place
  Net Worth math could live, and a second place it could drift from the current-balance path if
  either one changed independently. Deriving history from the same core function both paths share
  makes that drift structurally impossible rather than something to remember to keep in sync.
- **Do not duplicate canonical Net Worth math**: this was an explicit constraint on the Issue #51
  implementation task. A stored aggregate table would require its own capture-time computation —
  a second implementation of the same asset/liability classification the current-balance path
  already has.
- **Account-level detail is required regardless**: the task's own requirements (account-level
  balance change, category-level asset/liability change) need per-account historical values to
  exist somewhere. A stored Net Worth aggregate would still need account-level rows alongside it
  to support those — so the aggregate would be redundant, not simplifying.
- **Reconstruction accuracy**: an account's type can change or the account can be archived after
  a snapshot exists. Each `account_balance_snapshots` row denormalizes `accountType` and
  `balanceSource` as they were *at capture time*, so historical reconstruction never depends on a
  possibly-since-changed live `accounts` row — a stored aggregate computed once at capture time
  would have the same property, but only for the total, not for any of the account- or
  category-level detail the task also requires.

---

# Consequences

## Advantages

- Exactly one Net Worth calculation path, current or historical.
- Account-level and category-level historical detail comes for free — it's the same rows the
  totals are derived from, not a second capture.
- A capture is a simple, uniform operation: snapshot every active account's current balance and
  denormalized classification. No aggregation logic needs to run at capture time at all.
- Immutability is enforced at the smallest possible grain (one account, one date) rather than a
  coarser aggregate that would need to be entirely recomputed if a correction were ever needed.

## Tradeoffs

- Computing Net Worth for N historical dates requires grouping and reducing N × (accounts per
  owner) rows at read time, rather than reading N pre-computed aggregate rows. For a single
  owner's history (tens to low hundreds of rows), this is negligible; it would need revisiting if
  Net Worth history were ever computed across many owners in one request.
- Capacity to store a Net Worth-level `calculationVersion` (net-worth-model.md §14) for
  a future non-backward-compatible classification change is deferred — each historical point is
  currently reconstructed using today's classification logic (`getAccountPresentation`), not a
  versioned snapshot of the classification rules themselves. Acceptable for V1: no such
  classification change exists yet, and the task's list of building blocks does not ask for one.

These tradeoffs are considered acceptable — the alternative reintroduces the exact duplication
this decision exists to avoid.

---

# Alternatives Considered

## Stored Net Worth Aggregate Table

Rejected.

Requires a second computation of the same asset/liability classification current Net Worth
already has, and still needs account-level rows alongside it to support account/category-level
history — making the aggregate redundant rather than simplifying.

---

## Recompute History From Current Account Balances

Rejected outright, not merely as an alternative architecture — this is exactly what the task
(and net-worth-model.md §2's "Snapshot Driven" principle) explicitly forbids: historical Net
Worth must never be recalculated using current values. It would silently fabricate every
historical data point.

---

# Implementation Notes

- `src/db/schema/net-worth-snapshots.ts` — `account_balance_snapshots` table: owner-scoped,
  insert-only (`createdAt` only, no `updatedAt`/`deletedAt`), unique on `(account_id,
  snapshot_date)` for idempotent capture, `SELECT`/`INSERT`-only RLS grants (no `UPDATE`, no
  `DELETE` — see net-worth-model.md §19).
- `src/application/net-worth/net-worth-breakdown.ts` — `computeNetWorthBreakdownCore` is the one
  shared classification function; `computeNetWorthBreakdown` (current) and
  `computeHistoricalNetWorthBreakdown` (a date's snapshot rows) are both thin wrappers over it.
- `src/application/net-worth/net-worth-history-calculations.ts` — history/delta/account-change/
  category-change math, all built on the shared core above.
- `src/application/net-worth/snapshot-capture-service.ts` — the real capture path
  (`captureSnapshot`/`captureMonthlySnapshot`/`captureManualSnapshot`), idempotent via
  `ON CONFLICT DO NOTHING` on the unique index above.

---

# Status

Accepted.

This decision establishes the architecture for how Athena stores and computes historical Net
Worth, and should be treated as the authoritative approach for any future Net Worth history,
trend, or Reports work.

---

# Related Documents

- `docs/products/net-worth-specification.md`
- `docs/financial-model/net-worth-model.md`
- `docs/architecture/domain-model.md`
- `docs/adr/0003-goal-allocation-model.md`

---

# Revision History

| Version | Date       | Author         | Summary                                                                                                   |
| ------- | ---------- | -------------- | ----------------------------------------------------------------------------------------------------------- |
| 1.0.0   | 2026-08-07 | Caitlin Gillum | Established account-level snapshot storage with read-time-derived Net Worth history as Athena's architecture for historical Net Worth, replacing consideration of a stored Net Worth aggregate table. |
