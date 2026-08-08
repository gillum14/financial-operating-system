# ADR-0007: Mission Progression System

**Project:** Financial Operating System

**Internal Codename:** Athena

**Document Version:** 1.0.0

**Status:** Accepted — supersedes ADR-0006's gamification exclusion

**Date:** August 08, 2026

**Owner:** Caitlin Gillum

**Primary Architect:** Caitlin Gillum

**Technical Advisor:** Claude (Anthropic)

---

# Context

ADR-0006 established, as an explicit and repeatedly-reaffirmed decision, that Mission Engine V1 would implement **no** XP, levels, streaks, badges, or rewards — a direct exclusion from `missions-model.md`'s full documented vision. That decision was confirmed three separate times across this branch's history: the original commissioning task's "do not implement" list, an explicit user choice during a follow-up clarification ("Do not add XP, streaks, badges, rewards, or AI"), and again when the Missions page's summary tiles were restored to match a reference mockup — offered the choice between honest placeholders and a real system, the honest-placeholder option was chosen.

This task explicitly reverses that decision: a fully specified request for a real, persistent XP/level/streak/rewards system, with exact point values, an exact leveling formula, an exact streak rule, and an exact initial reward list. The request is deliberate and detailed enough (not a vague "add gamification") to be treated as the authoritative override of ADR-0006's exclusion, not a misunderstanding to push back on a fourth time.

---

# Decision

Build a **Mission Progression System** as a structurally separate layer on top of the existing Mission Engine, satisfying two constraints given directly alongside the feature request:

1. **XP/progression must remain separate from the Confidence Score** — Confidence continues to be computed exclusively from real financial data (Accounts, Transactions, Budgets, Goals, Net Worth), never from mission completions, XP, levels, or streaks.
2. **Reuse the existing mission architecture; make the smallest safe schema extension necessary** — no parallel mission system, no duplicated completion logic.

## Schema

- `missions` gains three columns, all captured once at creation/start and never edited afterward: `difficulty` (easy/medium/hard/major-milestone, null for custom), `xp_value` (the real, locked award amount — captured as a number, not re-derived from `difficulty` later), `is_daily_mission` (whether this mission was started from the Daily Mission spotlight, for the one-time +25 XP bonus).
- `mission_progression` — one row per owner: `total_xp`, `current_streak`, `longest_streak`, `completed_mission_count`, `last_qualifying_completion_date`. Level is **derived** from `total_xp` (`floor(xp / 1000) + 1`), never stored, so it can never drift from the number it represents.
- `mission_xp_events` — immutable, one row per completion, **unique on `mission_id`**. This unique index is the actual mechanism that makes "XP is only ever awarded once per mission" a database guarantee rather than an application convention that could be defeated by a retried request or a bug.
- `mission_rewards` — immutable, one row per unlock, unique on `(owner_id, reward_key)`. Unlocking is naturally idempotent for the same reason.

A real, pre-existing mission (started by manual live testing on the canonical seed owner, before this migration) required backfilling `difficulty`/`xp_value` rather than a blind `NOT NULL` default — handled in the migration itself via a `CASE` on `mission_type`, not left broken or silently defaulted to zero.

## Difficulty → XP mapping

Not specified by the commissioning task, so resolved as an explicit judgment call, documented rather than silently invented:

| Mission type | Difficulty | XP |
|---|---|---|
| categorize-transactions | Easy | 50 |
| stay-within-budget | Medium | 100 |
| reach-savings-goal | Medium | 100 |
| reduce-debt | Hard | 200 |
| improve-confidence | Hard | 200 |
| fund-emergency-fund | Major Milestone | 500 |
| custom | — | 100 (flat cap, not difficulty-based) |

Reasoning: categorizing transactions is quick organizational upkeep; staying within budget and reaching a savings goal are month-scale behaviors; paying down debt and crossing a Confidence band are larger, harder wins; fully funding an emergency reserve is the one foundational, capstone-scale mission in the six real types. Custom missions get the cap value itself rather than a difficulty-picker UI, keeping the "smallest safe extension" promise — a custom mission's difficulty is unknowable to the system by definition.

## Where XP is awarded

Hooked into the exact two places a mission ever transitions to Completed — `MissionService.listMissionsWithProgress`'s deterministic auto-evaluation branch, and `completeCustomMission` — never a third path. `MissionProgressionService.recordMissionCompletion(mission)` is called immediately after each transition, reading `xpValue`/`isDailyMission`/`difficulty`/`completedAt` directly off the mission row it's given. It has **zero constructor dependencies on GoalService, BudgetService, AccountRepository, TransactionRepository, or a Confidence score getter** — this is what makes the Confidence separation structural rather than a convention: there is no code path by which this system could read or influence a Confidence Score, because it never receives one.

## Streak rule (one grace day)

A completion on day *N* extends the streak if the previous qualifying completion was on day *N-1* (consecutive) or *N-2* (one day skipped, the grace day); a wider gap resets to 1; the same calendar day as the prior completion is a no-op (multiple completions in one day don't inflate the streak). Every mission completion — including custom missions — is a qualifying event; there is no separate "streak-eligible" mission subset.

## Rewards

The 8 specified rewards, each a deterministic threshold check (`REWARD_DEFINITIONS` in `progression-calculations.ts`) against real progression numbers — completed-mission count, current streak, derived level, or "was the just-completed mission a Major Milestone." Re-checked, unconditionally, after every single completion; a reward that's already unlocked is filtered out in application code and blocked again at the database layer, so over-checking is always safe.

## A transaction-safety bug found and fixed during implementation

The first implementation of "insert, and treat a unique-constraint conflict as a safe no-op" used a plain insert wrapped in try/catch. This is unsafe inside a Postgres transaction: a `unique_violation` aborts the **entire** transaction (SQLSTATE `25P02`, "current transaction is aborted") until it's rolled back — catching the JS exception doesn't undo that server-side state, so any later query in the same transaction fails even though the application code "handled" the error. This was caught by the DB-integration test suite itself (the idempotency test failed with `25P02` on its second call). Fixed by using `ON CONFLICT DO NOTHING` at the SQL level for both `mission_xp_events` and `mission_rewards` inserts, and for the `mission_progression` one-per-owner row's create-or-fetch — none of these ever raise an exception on a conflict, so the transaction stays healthy regardless of whether the caller is a single autocommitted statement (production) or a multi-statement wrapping transaction (a `withRollback`-based test, or any future `db.transaction()` call site).

---

# Rationale

- **A fully specified, repeated request is a decision, not an ambiguity.** ADR-0006 existed to prevent silently inventing gamification the product docs described but this task's constraints excluded. This request is the opposite case: an explicit, detailed specification that supersedes that exclusion directly. Re-litigating it a fourth time would have been unhelpful, not careful.
- **Structural Confidence separation, not a policy.** Every prior Mission Engine decision in this branch treated "Confidence remains authoritative" as non-negotiable. Giving `MissionProgressionService` no dependency capable of reading financial data makes that true by construction — there's nothing to audit for accidental influence, because the class cannot reach a Confidence Score even if it tried.
- **Database-enforced idempotency, not just careful code.** "XP must only be awarded once per mission" was specified as a hard requirement, and unique indexes (not "just don't call it twice") are what this codebase already reaches for whenever a hard invariant needs to survive a retry, a bug, or concurrent requests — the same reasoning `goal_allocations_no_overallocation` and the QA-fixture `mission_xp_events.mission_id` index already reflect elsewhere in this project.

---

# Consequences

## Advantages

- Every XP/level/streak/reward number displayed anywhere is real and independently auditable against `mission_xp_events`/`mission_rewards` — no client-side or cached computation that could drift from the ledger.
- The exactly-once guarantee holds even under retries, bugs, or (hypothetically) future concurrent-request scenarios, because it's enforced by the database, not application discipline.
- Confidence Engine code and Mission Progression code share no dependency edge in either direction — verified structurally in `missions-composition.test.ts`.

## Tradeoffs

- The difficulty-to-XP mapping and the custom-mission flat cap are judgment calls, not specified values — recorded here explicitly so a future reader knows they were a deliberate choice, not derived from a source of truth that doesn't exist.
- `UpcomingRewardsCard` and the Missions page's XP badges go beyond the literal ask ("Replace the Missions page placeholders with real Total Points, Level, Current Streak, and Rewards Earned values") because leaving them as honest-empty placeholders would now be actively false — the system they described as "not built" is built. This was a within-scope consequence of the reversal, not independent scope creep.

---

# Alternatives Considered

## Store `level` as a column, updated alongside `totalXp`

Rejected. A derived value recomputed on every read can never drift from the number it represents; a stored, separately-updated column can, the same reasoning ADR-0006's Confidence Score `effectiveWeight` and this codebase's Goal/Budget progress fields already apply.

## Difficulty selectable by the user for custom missions

Rejected for V1. Adds a form field and a trust question ("why did the user pick Major Milestone for a mission that took two minutes") for a type of mission the system cannot verify at all. The flat 100 XP cap is simpler and matches "custom missions capped at 100 XP" literally.

## Catch the unique-violation exception instead of ON CONFLICT DO NOTHING

This was the first implementation, and it was wrong — see "A transaction-safety bug found and fixed during implementation" above. `ON CONFLICT DO NOTHING` is the correct pattern for this exact case, and is already used elsewhere in this codebase (`account_balance_snapshots`/`confidence_score_snapshots` capture idempotency) for the identical reason.

---

# Implementation Notes

- `src/db/schema/missions.ts` — `MISSION_DIFFICULTIES`, and the three new columns on `missions`.
- `src/db/schema/mission-progression.ts` — `missionProgression`, `missionXpEvents`, `missionRewards`, `MISSION_REWARD_KEYS`.
- `src/application/missions/progression-calculations.ts` — `XP_BY_DIFFICULTY`, `MISSION_TYPE_DIFFICULTY`, `computeMissionXpValue`, `computeLevel`, `computeStreakUpdate`, `REWARD_DEFINITIONS`, `computeNewlyEligibleRewards`. Pure, zero dependencies — the single canonical location for every progression formula.
- `src/application/missions/progression-service.ts` — `MissionProgressionService.recordMissionCompletion`, called from both of `MissionService`'s completion transitions.
- `src/infrastructure/db/mission-progression-repository.ts` — the `ON CONFLICT DO NOTHING` implementations.
- `src/features/missions/components/{missions-summary-metrics,upcoming-rewards-card,daily-mission-card}.tsx` — the real-data UI surfaces.

---

# Status

Accepted. This decision supersedes ADR-0006's gamification exclusion specifically; ADR-0006 remains the historical record of why that exclusion existed and should be read alongside this one, not deleted or treated as having been wrong at the time.

---

# Related Documents

- `docs/adr/0006-mission-engine-v1-scope.md` — the decision this ADR supersedes.
- `docs/financial-model/missions-model.md` §9–§12 — the original XP/Levels/Streaks/Theme-Unlocks product vision this system implements a real subset of.
- `docs/architecture/domain-model.md`'s Missions section.

---

# Revision History

| Version | Date       | Author         | Summary                                                                                                   |
| ------- | ---------- | -------------- | ----------------------------------------------------------------------------------------------------------- |
| 1.0.0   | 2026-08-08 | Caitlin Gillum | Established the Mission Progression System — real XP, levels, streaks, and rewards, structurally separate from Confidence — reversing ADR-0006's gamification exclusion per an explicit, fully-specified request. |
