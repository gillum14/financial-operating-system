# Budgets Model

**Project:** Financial Operating System

**Internal Codename:** Athena

**Document Version:** 1.0.0

**Status:** Draft

**Owner:** Caitlin Gillum

**Primary Architect:** Caitlin Gillum

**Technical Advisor:** OpenAI ChatGPT

**Last Updated:** August 03, 2026

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
- Historical budget snapshots

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
- Budget Snapshot

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
- Historical snapshots

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
- Immutable historical snapshots
- Explicit adjustments
- Valid lifecycle state
- Budget totals that reconcile

Athena must never:

- Fabricate spending
- Rewrite transaction history
- Lose adjustment history
- Recalculate historical snapshots
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
