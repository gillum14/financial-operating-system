# ADR-0006: Mission Engine V1 Scope

**Project:** Financial Operating System

**Internal Codename:** Athena

**Document Version:** 1.0.0

**Status:** Partially superseded by [ADR-0007](./0007-mission-progression-system.md) (see note below)

**Date:** August 08, 2026

**Owner:** Caitlin Gillum

**Primary Architect:** Caitlin Gillum

**Technical Advisor:** Claude (Anthropic)

---

> **Superseded, in part (2026-08-08):** this ADR's exclusion of XP,
> levels, streaks, and rewards was reversed later the same day by an
> explicit, fully-specified request — see
> [ADR-0007: Mission Progression System](./0007-mission-progression-system.md).
> Everything else below (the 6 deterministic mission types, the 4-state
> lifecycle, the eligibility engine, Confidence separation, no household/
> custom-mission-library/AI-generated missions) remains accurate and in
> effect. This document is kept as the historical record of why the
> exclusion existed in the first place — read alongside ADR-0007, not in
> place of it.

---

# Context

`docs/products/mission-engine.md`, `docs/products/missions-specification.md`, and `docs/financial-model/missions-model.md` describe a full, heavily gamified Missions product: a universal experience-points (XP) system, visible user levels, streak-based theme unlocks, badges, celebrations, household/shared missions, a mission-recommendation engine, and fully user-created custom missions with user-defined XP values — all explicitly named as Version 1 "Product Decisions" in `missions-model.md` §9–§15.

Mission Engine V1 (this branch) was commissioned with the opposite constraint set: no gamification system of any kind, and an explicit "do not implement" list covering XP, streaks, achievements, badges, leaderboards, AI-generated missions, and notifications. The commissioning task also specified a 4-state lifecycle (`available`, `active`, `completed`, `archived`) — narrower than the docs' 7-state lifecycle (`Suggested`, `Available`, `Active`, `Paused`, `Completed`, `Dismissed`, `Archived`) — and a closed set of 6 mission types, versus the docs' much larger, open-ended catalog (Awareness/Habit/Investment/Retirement/Lifestyle/Education/Milestone/Custom/Household).

This is a direct, structural conflict between the written product specification and the commissioned implementation, not an ambiguity that could be resolved by reading the docs more carefully. It was surfaced and confirmed with the product owner before any code was written (see this branch's PR description for the full gap report and the four scoping decisions made in response). This ADR records the resulting scope so future work on Missions has one authoritative reference for what V1 actually is, rather than either the full docs (never built) or the code alone (no rationale visible).

---

# Decision

Mission Engine V1 implements a **non-gamified, deterministic mission-tracking core** — a strict subset of the documented product vision, with every reward/social/AI-generated layer deferred (not designed, not scaffolded) to a future version:

## What V1 builds

- **Six mission types**, each backed by a domain that already exists and already computes its own real numbers: `stay-within-budget` (Budgets), `fund-emergency-fund` and `reach-savings-goal` (Goals), `categorize-transactions` (Transactions), `reduce-debt` (Accounts), `improve-confidence` (Confidence Engine, read-only).
- **A 4-stage lifecycle**, only 3 of which are ever persisted rows: `available` is a live, computed-on-read eligibility result (never a database row); `active` → `completed` → `archived` are the only real `missions` table statuses. A mission is never suggested, never AI-generated, and never exists as a row until a user explicitly starts it.
- **Deterministic evaluation**: every mission's progress is recomputed live, on every read, from the real domain data it's tied to — never cached, never inferred from unrelated activity. Active missions are auto-transitioned to Completed (with a real `completedAt`) the moment their real progress crosses the deterministic threshold; there is no manual "claim completion" step and no background job — evaluation happens inline whenever missions are read.
- **Real completion timestamps**, owner-scoped persistence, and archival (never hard-deletion) — the same lifecycle-preservation convention as Goals/Budgets.

## What V1 does not build

- No XP, levels, streaks, badges, achievements, leaderboards, celebrations, or theme unlocks. **(XP, levels, streaks, and a fixed initial reward list were added later — see the superseding note above and ADR-0007. Badges/leaderboards/celebrations/theme-unlocks remain out of scope.)**
- No rewards field of any kind (cosmetic, personal, or otherwise) — the commissioning task's own "each mission should expose" field list omits it entirely.
- No mission recommendation/AI-suggestion engine — eligibility is pure, deterministic conditional logic (mirrors `deriveUpcomingObjectives` in `goal-calculations.ts`), not a scored or learned recommendation.
- No household/shared missions, no custom user-created missions, no mission library, no `Suggested`, `Paused`, or `Dismissed` lifecycle states, no five-active-mission limit, no notifications.

---

# Rationale

- **The commissioning instruction is the more specific, more recent authority.** "Do not invent a gamification system" and an enumerated "do not implement" list are about as unambiguous as a scope boundary gets, and the task's own framing ("Examples of V1 mission types — only if supported by the documentation") signals that the docs were expected to be curated down, not implemented wholesale.
- **"Missions should reinforce real financial behaviors" and "Confidence remains the authoritative financial measurement"** are structurally easier to guarantee with a smaller, fully-deterministic surface — every one of the six mission types reduces to reading another domain's own already-correct calculation output, so there is no new place for Mission Engine math to disagree with Budgets/Goals/Confidence, and no reward mechanism that could create pressure to inflate a number.
- **The docs' own lifecycle and lifecycle-adjacent language already assumes a recommendation engine** ("Athena recommends a mission," "Suggested" as the entry state) that AI-generated missions were explicitly excluded from building. Making `available` a computed, non-persisted eligibility result (rather than a `Suggested` row nobody is generating) is the smallest structural change that keeps the requested 4-state lifecycle honest: there is no code path that could ever "suggest" a mission a user didn't ask to see.
- **Confidence Engine separation is structural, not just documented.** `mission-calculations.ts` never imports `computeConfidenceScore`; `improve-confidence` missions only ever read the Confidence Engine's own already-computed overall score and band thresholds (`nextBandUp`, `CONFIDENCE_BANDS`) — completing a mission cannot change confidence math, and confidence math cannot be duplicated by Missions. Verified structurally in `missions-composition.test.ts`.

---

# Consequences

## Advantages

- Every mission type is real, explainable, and impossible to fabricate — there is no field on a Mission that isn't derived from Budgets/Goals/Transactions/Accounts/Confidence's own real, already-tested calculations.
- No gamification surface means no future work is required to walk back an engagement mechanic that turned out to conflict with "Athena must never create missions solely to increase engagement" (`missions-specification.md` §2).
- The eligibility engine (`mission-eligibility.ts`) and progress engine (`mission-calculations.ts`) are both pure functions, trivially unit-testable with plain fixtures — no database, no mocking.

## Tradeoffs

- **The product docs are now aspirational, not descriptive**, for Missions specifically — a reader of `mission-engine.md`/`missions-specification.md`/`missions-model.md` alone would reasonably expect XP, levels, and streaks to exist. This ADR, and a short "V1 Implementation Scope" note added to the top of each of those three docs, are the pointer from the aspirational spec to what's actually built.
- **No mission recommendation intelligence** — eligibility is "does real data currently satisfy this fixed rule," not "what is the single highest-impact mission for this user right now" (`missions-specification.md` §16). A future recommendation layer, if built, sits on top of this eligibility engine rather than replacing it.
- **`reduce-debt` and `improve-confidence` completion criteria were not directly specified anywhere** (no existing Debt domain to anchor to; no documented Confidence-mission threshold) and were resolved as part of this same scoping conversation: `reduce-debt` targets a full payoff of one specific liability account; `improve-confidence` targets the real Confidence Engine's next band up, captured at mission start. Both are recorded here since they're genuine judgment calls, not read directly from any doc.

---

# Alternatives Considered

## Implement the full documented system as-is

Rejected outright — directly contradicts the commissioning task's explicit "do not invent a gamification system" instruction.

## Pause until the product docs are revised to match a narrower V1

Rejected. The commissioning task's own scope (four lifecycle states, six mission types, an explicit exclusion list) was specific enough to implement directly once confirmed; waiting on a doc rewrite would have blocked real, wanted functionality for a documentation-process reason, and this ADR plus the docs' new scope notes close that gap without a rewrite.

## Persist "available" as a real `Suggested`/`Available` row

Rejected. Nothing in this codebase generates a mission recommendation (no AI, no scored ranking), so a persisted "available" row would either sit there forever unless something wrote it, or require inventing exactly the recommendation-generation mechanism this task excluded. Computing eligibility live, on read, from real data is the only version of "available" that doesn't require solving a problem out of scope.

---

# Implementation Notes

- `src/db/schema/missions.ts` — `MISSION_TYPES` (6 values), `MISSION_STATUSES` (`active`/`completed`/`archived` only — no `Suggested`/`Paused`/`Dismissed` column values exist).
- `src/application/missions/mission-eligibility.ts` — `computeEligibleMissionCandidates`, the entire "available" concept; never persisted, never imports any AI/LLM dependency.
- `src/application/missions/mission-calculations.ts` — one deterministic progress function per mission type, `MISSION_TYPE_PILLAR` (display-only Confidence pillar mapping).
- `src/application/missions/service.ts` — `MissionService.listMissionsWithProgress` is where auto-completion actually happens (evaluate-on-read); `startMission` re-validates eligibility server-side before writing anything.
- `docs/products/mission-engine.md`, `docs/products/missions-specification.md`, `docs/financial-model/missions-model.md` — each now carries a short "V1 Implementation Scope" note near the top pointing back to this ADR.

---

# Status

Accepted.

This decision establishes the authoritative scope boundary for Mission Engine V1 and should be treated as binding for any future Missions work until a new ADR revises it.

---

# Related Documents

- `docs/products/mission-engine.md`
- `docs/products/missions-specification.md`
- `docs/financial-model/missions-model.md`
- `docs/adr/0005-confidence-engine-missing-data-policy.md` (the Confidence Engine's own precedent for resolving an undocumented gap via ADR rather than silent invention)

---

# Revision History

| Version | Date       | Author         | Summary                                                                                                   |
| ------- | ---------- | -------------- | ----------------------------------------------------------------------------------------------------------- |
| 1.0.0   | 2026-08-08 | Caitlin Gillum | Established Mission Engine V1's non-gamified scope, reconciling the commissioning task's explicit constraints against the full documented product vision. |
