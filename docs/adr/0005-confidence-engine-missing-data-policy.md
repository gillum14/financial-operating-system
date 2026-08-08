# ADR-0005: Confidence Engine Missing-Data Policy

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

`docs/products/confidence-engine.md` defines the Confidence Score's 8 pillars and their exact weights, but does not define what happens when a pillar (or a signal within it) has no real evidence for a given owner — e.g. no investment accounts, no active budget, no historical Net Worth snapshot yet. Every other implemented domain in this codebase (Net Worth, Goals, Budgets) has a companion `docs/financial-model/*.md` with exact formulas; no such document exists for Confidence, and this specific gap — what an unmeasurable pillar contributes to the overall score — has no precedent anywhere in this repository's docs. Building Confidence Engine V1 required resolving it before any calculation code could be written.

Three approaches were considered:

1. Exclude the pillar/signal entirely and renormalize the remaining available pillars' weights to sum to 100%.
2. Score the pillar/signal as a neutral 50/100.
3. Score the pillar/signal as 0/100.

---

# Decision

Athena excludes pillars and signals with no knowable evidence, and renormalizes the remaining available pillars' spec weights to sum to 100% for the overall score. Every signal — available or not — still emits a reason code explaining what was or wasn't measured and why.

A related, narrower decision made after unit tests surfaced the edge case: "no accounts of a given type" (e.g. no investment accounts) is only ever scored as a real, available, negative signal once the owner has *some* account engagement at all. A genuinely brand-new owner with zero accounts of any kind gets an honest "unavailable" instead — otherwise a user who simply hasn't started using the app yet would be scored as an instant failure on Investing, Retirement, and Financial Habits before doing anything.

---

# Rationale

- **Transparency over Mystery** (confidence-engine.md's own philosophy): the score must always reflect only what is actually known. A neutral 50 for something genuinely unknown quietly asserts "average," which is not true — it's unmeasured, not average.
- **Coaching over Judgment / Progress over Perfection**: scoring missing data as 0 treats "we don't know" identically to "we know it's bad" — a user with no investment accounts because they haven't linked one yet would score identically to a user whose portfolio is actively collapsing. That conflates absence of data with a real bad outcome, which the spec's own principles explicitly reject.
- **Consistency with Net Worth History's precedent** (ADR-0004): "first snapshot establishes baseline," never fabricate history — the same instinct applied to missing *cross-sectional* data (a pillar with no evidence right now), not just missing *historical* data.

---

# Consequences

## Advantages

- The score is always defensible: every point comes from real evidence, traceable via reason codes.
- New users are never punished for not having engaged with a feature yet.
- No fabricated data ever silently influences a pillar or the overall score.

## Tradeoffs

- The overall score's meaning shifts subtly depending on how many pillars are available for a given owner (a score computed from 3 available pillars is a different kind of number than one computed from 8) — `effectiveWeight` is exposed on every pillar specifically so this is inspectable, not hidden.
- Two owners with identical real evidence in their available pillars but a different number of *unavailable* pillars will show different overall scores, which could look surprising without the accompanying reason codes.

These tradeoffs are accepted — the alternative (a fabricated neutral or punitive default) would violate the spec's own explicit principles.

---

# Alternatives Considered

## Neutral Default (50/100)

Rejected. Silently asserts "average" for something genuinely unknown, which "Transparency over Mystery" forbids.

## Punitive Default (0/100)

Rejected. Treats a new user's lack of engagement with a feature identically to a real bad outcome, which "Coaching over Judgment" and "Progress over Perfection" explicitly forbid.

---

# Implementation Notes

- `src/application/confidence/confidence-calculations.ts` — `computeConfidenceScore`'s aggregation step computes `effectiveWeight` per pillar (0 when unavailable, `weight / totalAvailableWeight` otherwise) and an `overallScore` that is `null` only when every pillar is unavailable.
- Every signal function returns a `ConfidenceSignal` with `status: "available" | "unavailable"` and a `reasonCode` regardless of status — see that file's module comment for the full policy statement and per-signal documentation of which specific judgment calls this policy required.

---

# Status

Accepted.

This decision establishes how the Confidence Engine handles incomplete evidence and should be treated as the authoritative approach for any future Confidence pillar, signal, or scoring work.

---

# Related Documents

- `docs/products/confidence-engine.md`
- `docs/architecture/domain-model.md` (Confidence section)
- `docs/adr/0004-net-worth-snapshot-architecture.md`

---

# Revision History

| Version | Date       | Author         | Summary                                                                                                   |
| ------- | ---------- | -------------- | ----------------------------------------------------------------------------------------------------------- |
| 1.0.0   | 2026-08-07 | Caitlin Gillum | Established the exclude-and-renormalize missing-data policy for the Confidence Engine, resolving a gap the product specification left undefined. |
