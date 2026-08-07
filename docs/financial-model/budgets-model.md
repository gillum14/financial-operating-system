# Budgets Model

**Project:** Financial Operating System

**Internal Codename:** Athena

**Document Version:** 1.1.0

**Status:** Draft

**Owner:** Caitlin Gillum

**Primary Architect:** Caitlin Gillum

**Technical Advisor:** OpenAI ChatGPT

**Last Updated:** August 06, 2026

---

# Table of Contents

1. Purpose
2. Design Philosophy
3. Core Entities
4. Budget
5. Budget Period
6. Budget Category
7. Budget Allocation
8. Budget Adjustment
9. Budget Health
10. Budget Template
11. Budget Snapshot
12. Budget Lifecycle
13. Budget Calculations
14. Household Budgeting
15. Relationship to Transactions
16. Relationship to Goals
17. Relationship to Reports
18. Relationship to Net Worth
19. Relationship to the Confidence Engine
20. Safety and Validation Rules
21. Future Enhancements
22. Revision History

---

# 1. Purpose

The Budgets domain models how users intentionally allocate available income across financial priorities.

It provides the planning layer of Athena while consuming actual spending from the Transactions domain.

The Budgets domain owns:

- Budget plans
- Budget periods
- Budget categories
- Planned allocations
- Budget adjustments
- Budget health
- Historical budget snapshots (deferred to a future version — see §11)

It does **not** own spending activity.

Actual financial activity remains the responsibility of the Transactions domain.

---

# 2. Design Philosophy

The Budgets domain follows several guiding principles.

## Planning Over Tracking

Budgets represent future financial intent.

Transactions represent completed financial activity.

---

## Zero-Based Budgeting

Every available dollar should receive an intentional purpose.

Savings and investments are valid allocations.

---

## Explainable

Every budget value should be reproducible from:

- Planned allocation
- Categorized spending
- Budget adjustments

---

## Flexible

Budgets should adapt as financial circumstances change.

Adjustments are expected rather than discouraged.

---

## Deterministic

Given the same allocations and transactions, Athena should always calculate identical budget results.

---

# 3. Core Entities

The Budgets domain consists of:

- Budget
- Budget Period
- Budget Category
- Budget Allocation
- Budget Adjustment
- Budget Health
- Budget Template
- Budget Snapshot (deferred — see §11)

---

# 4. Budget

A Budget represents an overall financial plan.

Each budget may contain:

- Budget ID
- Owner ID
- Budget Name
- Budget Type
- Default Period
- Current Period
- Status
- Created Timestamp
- Updated Timestamp

A Budget serves as the parent container for one or more Budget Periods.

---

# 5. Budget Period

A Budget Period represents one planning cycle.

Each period may contain:

- Budget Period ID
- Budget ID
- Period Start
- Period End
- Status
- Planned Income
- Total Allocated
- Total Spent
- Remaining Balance
- Created Timestamp
- Updated Timestamp

Supported periods include:

- Monthly
- Quarterly (future)
- Annual (future)
- Custom (future)

---

# 6. Budget Category

Budget Categories represent planned spending or savings areas.

Each category may contain:

- Category Budget ID
- Budget Period ID
- Category ID
- Planned Amount
- Actual Spending
- Remaining Amount
- Progress
- Notes
- Display Order

Categories reference the canonical Categories domain.

Budgets do not own category definitions.

---

# 7. Budget Allocation

Budget Allocations represent intentional assignment of income.

Each allocation may include:

- Allocation ID
- Budget Category ID
- Planned Amount
- Allocation Date
- Allocation Source
- Created Timestamp

Allocation sources may include:

- User
- Template
- Future Recommendation Engine

---

# 8. Budget Adjustment

Budget Adjustments preserve changes made after a budget period begins.

Each adjustment may contain:

- Adjustment ID
- Budget Category ID
- Previous Amount
- New Amount
- Difference
- Reason
- Created Timestamp

Adjustments preserve historical planning decisions.

They never modify transaction history.

---

# 9. Budget Health

Budget Health summarizes budget performance.

Health may include:

- Health Status
- Categories On Track
- Categories Overspent
- Remaining Allocation
- Spending Variance
- Budget Utilization
- Last Evaluation

Possible health states include:

- Excellent
- Healthy
- Attention Needed
- Overspent

Health summarizes performance without replacing detailed calculations.

---

# 10. Budget Template

Budget Templates provide reusable planning structures.

Each template may contain:

- Template ID
- Owner ID
- Template Name
- Category Definitions
- Planned Allocations
- Default Period
- Created Timestamp

Templates never contain transaction data.

---

# 11. Budget Snapshot

**V1 status: deferred.** Budget Snapshots, as described below, are not implemented in V1. This section documents the target design for a future version, and the paragraphs at the end of this section describe what V1 does instead and why that is a deliberate decision rather than an oversight.

Budget Snapshots preserve historical budget performance.

Each snapshot may contain:

- Snapshot ID
- Budget Period ID
- Snapshot Date
- Planned Total
- Actual Spending
- Remaining Amount
- Overspending
- Budget Health
- Calculation Version

Snapshots are immutable.

Historical reporting references snapshots rather than recalculating prior periods.

## V1 Behavior (No Snapshots)

V1 preserves history at the entity level instead of the snapshot level:

- Budget Period, Budget Allocation, and Budget Adjustment rows are never hard-deleted. A Completed or Archived period's allocations remain exactly as they were when the period closed — see §12 Budget Lifecycle and §20 Safety and Validation Rules.
- Budget Adjustments already give every planning change (including changes made before a period closed) a permanent, timestamped, immutable record — this is real historical preservation, just not a full point-in-time snapshot of computed totals.
- A Completed period's Planned, Actual, Remaining, Variance, Utilization, and Overspending figures are **recomputed live** from the same Budget Calculations (§13) applied to the period's Budget Allocations and the authoritative Transactions falling within its date range — not read from a frozen snapshot, because no snapshot exists yet.
- This is safe today because Transactions are themselves treated as an immutable historical record in normal operation (§15) — a completed period's date range doesn't change, and the transactions inside it aren't expected to change either, so live recomputation and a hypothetical frozen snapshot would produce the same result.

## Why Snapshots Are Deferred, Not Skipped

Immutable Budget Snapshots become a **required** addition — not merely a nice-to-have — under either of these conditions:

1. **Historical transaction mutability.** If Athena ever permits editing, re-categorizing, or deleting a Transaction whose date falls inside a Completed or Archived Budget Period in a way that could materially change that period's already-reported totals, snapshots (or an equivalent frozen record) become necessary to keep a closed period's reported results from silently shifting underneath the user. V1 does not need this guarantee because it does not yet expose that kind of retroactive transaction edit against closed-period history.
2. **Reporting or performance requirements.** If Reports (§17) or another downstream consumer needs fast historical aggregation across many closed periods without recomputing each one from raw Transactions on every read, or needs a stable point-in-time record independent of any future recalculation-logic change, snapshots become the correct mechanism.

Until one of those conditions applies, adding a snapshot table would be storing a second, cache-like copy of a value V1 can already compute correctly and cheaply on demand — the kind of premature abstraction this codebase's own engineering principles avoid. This is an explicit V1 product and architecture decision, not accidental technical debt left behind.

---

# 12. Budget Lifecycle

Budget periods progress through defined stages.

Supported states include:

- Draft
- Active
- Completed
- Archived

Future versions may support:

- Locked
- Approved
- Household Review

Lifecycle reflects planning state.

---

# 13. Budget Calculations

Core calculations include:

## Remaining

```text
Planned Allocation
− Actual Spending
=
Remaining
```

---

## Budget Utilization

```text
Actual Spending
÷ Planned Allocation
× 100
```

---

## Overspending

```text
Actual Spending
>
Planned Allocation
```

---

## Total Allocated

```text
Sum(All Planned Allocations)
```

---

## Total Spending

```text
Sum(Categorized Transactions)
```

---

## Budget Variance

```text
Planned
− Actual
```

Calculations should remain deterministic.

---

# 14. Household Budgeting

Household budgeting supports:

- Shared budgets
- Shared categories
- Shared allocations
- Shared adjustments

Ownership permissions remain enforced through the Household domain.

---

# 15. Relationship to Transactions

Transactions remain the authoritative source of financial activity.

Budgets consume:

- Categorized spending
- Transaction dates
- Exclusion status

Budgets never modify transaction history.

---

# 16. Relationship to Goals

Goals may receive funding through Budget Categories.

Budgets own planned funding.

Goals own progress toward completion.

---

# 17. Relationship to Reports

Reports aggregate budget performance.

Reports consume:

- Planned amounts
- Actual spending
- Variance
- Historical snapshots (once implemented — see §11; in V1, Reports would consume the same live-recomputed figures the Budgets domain itself uses, since no snapshot exists yet)

Reports never own budgets.

---

# 18. Relationship to Net Worth

Budget decisions influence future Net Worth through saving, investing, and debt reduction.

Net Worth calculations remain independent.

---

# 19. Relationship to the Confidence Engine

The Budgets domain contributes evidence including:

- Planning consistency
- Budget adherence
- Overspending frequency
- Savings allocations
- Financial discipline

Budgets provide evidence only.

Confidence calculations remain external.

---

# 20. Safety and Validation Rules

The Budgets model should enforce:

- Owner-scoped budgets
- One active budget period per schedule
- Canonical category references
- Deterministic calculations
- Immutable historical snapshots (applies once Budget Snapshots exist — see §11; in V1, with no snapshot table, the equivalent guarantee is that Budget Period, Allocation, and Adjustment rows are never hard-deleted or rewritten after the fact)
- Explicit adjustments
- Valid lifecycle state
- Budget totals that reconcile

Athena must never:

- Fabricate spending
- Rewrite transaction history
- Lose adjustment history
- Recalculate historical snapshots **once a snapshot has been taken** (§11) — this does not prohibit V1's live recomputation of a Completed period's totals from Transactions, since no snapshot exists in V1 to recalculate. Recomputing a live figure from an unmodified, authoritative source is not the same as rewriting a previously recorded one.
- Allow orphaned budget categories

Unknown states should fail safely.

---

# 21. Future Enhancements

Future capabilities may include:

- AI budget recommendations
- Smart category suggestions
- Automatic rollovers
- Multi-period budgeting
- Seasonal budgets
- Envelope budgeting
- Household collaboration
- Budget forecasting
- Cash-flow projections
- Scenario planning
- Confidence-driven planning
- Recommendation-generated allocations

---

# 22. Revision History

| Version | Date       | Author         | Summary                                                                                                                                                                                                                                                             |
| ------- | ---------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0.0   | 2026-08-03 | Caitlin Gillum | Established the canonical Budgets domain model defining budgets, planning periods, allocations, categories, adjustments, health evaluation, templates, snapshots, deterministic calculations, downstream relationships, validation rules, and future extensibility. |
| 1.1.0   | 2026-08-06 | Caitlin Gillum | Resolved documentation drift discovered while closing the Budgets Backend V1 slice: explicitly marked Budget Snapshots (§11) as deferred to a future version rather than implemented, documented V1's actual behavior of preserving history via immutable Budget Period/Allocation/Adjustment rows and live-recomputing Completed-period totals from Transactions, defined the two conditions (historical transaction mutability; reporting/performance need) under which snapshots become required, qualified §20's "never recalculate historical snapshots" rule so it no longer contradicts V1's correct live-recomputation behavior, and clarified §17's Reports relationship for the no-snapshot case. No entities, calculations, or lifecycle rules changed — clarification only. |
