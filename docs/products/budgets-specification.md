# Budgets Specification

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
2. Product Philosophy
3. Core Principles
4. Zero-Based Budgeting
5. Budget Periods
6. Budget Lifecycle
7. Budget Categories
8. Planned, Spent, and Remaining
9. Overspending
10. Budget Adjustments
11. Rollovers
12. Budget Templates
13. Budget Health
14. Household Budgeting
15. Relationship to Transactions
16. Relationship to Goals
17. Relationship to Reports
18. Relationship to Net Worth
19. Relationship to the Confidence Engine
20. User Experience
21. Security and Privacy
22. Future Enhancements
23. Product Decisions
24. Revision History

---

# 1. Purpose

The Budgets domain helps users intentionally assign every available dollar toward meaningful financial priorities.

Rather than focusing solely on spending limits, Athena treats budgeting as a proactive planning process that aligns income with long-term financial goals.

Budgets answer several key questions:

- Where should my money go?
- How much have I planned?
- How much have I spent?
- What remains available?
- Am I making progress toward my financial priorities?

---

# 2. Product Philosophy

Athena follows a modern zero-based budgeting philosophy.

Every available dollar should receive a purpose.

Budgets exist to create intentional financial decisions rather than restricting users through arbitrary spending limits.

The budgeting experience should feel:

- Flexible
- Transparent
- Explainable
- Encouraging
- Adaptable

Athena should educate users rather than punish them.

---

# 3. Core Principles

## Plan Before Spending

Budgets should encourage planning before money is spent.

---

## Every Dollar Has a Purpose

Available income should ultimately be allocated to meaningful categories.

---

## Reality Over Perfection

Budgets should adapt as life changes.

Adjustments are expected and encouraged.

---

## Honest Calculations

Budget totals should always reflect real transaction activity.

Athena should never fabricate progress.

---

## Explainability

Users should always understand:

- Planned amount
- Actual spending
- Remaining amount
- Overspending
- Budget changes

---

# 4. Zero-Based Budgeting

Athena's budgeting system is built around zero-based budgeting.

Users allocate available income across categories until every available dollar has been assigned.

Common allocation categories include:

- Housing
- Utilities
- Food
- Transportation
- Insurance
- Healthcare
- Debt
- Savings
- Investments
- Giving
- Entertainment
- Personal Spending
- Custom Categories

Zero-based budgeting does not require spending every dollar.

Savings and investments are valid allocations.

---

# 5. Budget Periods

Budgets are organized into defined periods.

Supported periods include:

- Monthly
- Quarterly (future)
- Annual (future)
- Custom (future)

Each budget period should maintain independent allocations and historical records.

---

# 6. Budget Lifecycle

Budget periods progress through several stages.

Possible states include:

- Draft
- Active
- Completed
- Archived

Future versions may support locked historical periods.

---

# 7. Budget Categories

Each budget consists of multiple categories.

Each category contains:

- Planned amount
- Actual spending
- Remaining amount
- Progress
- Notes (future)

Categories should remain user configurable.

Athena ships with recommended defaults but supports customization.

---

# 8. Planned, Spent, and Remaining

Each category tracks three primary values.

## Planned

Amount intentionally allocated.

---

## Spent

Actual categorized spending derived from Transactions.

---

## Remaining

Calculated as:

```text
Planned
− Spent
=
Remaining
```

Remaining values should update automatically as transactions change.

---

# 9. Overspending

Overspending occurs when:

```text
Spent
>
Planned
```

Overspending should be clearly communicated without discouraging users.

Athena should encourage adjustment rather than punishment.

---

# 10. Budget Adjustments

Users may modify budget allocations throughout an active period.

Adjustments should remain historically visible.

Possible reasons include:

- Income changes
- Unexpected expenses
- Goal changes
- Lifestyle changes

Budget adjustments should never rewrite historical transaction activity.

---

# 11. Rollovers

Future versions may support budget rollovers.

Examples include:

- Remaining savings
- Unused discretionary spending
- Category-specific rollover rules

Rollovers should always remain user controlled.

---

# 12. Budget Templates

Future users may create reusable templates.

Templates may define:

- Categories
- Planned allocations
- Budget period
- Default settings

Templates improve consistency across budgeting periods.

---

# 13. Budget Health

Budget Health summarizes how well the current budget is performing.

Future indicators may include:

- Categories on track
- Overspent categories
- Remaining allocation
- Budget utilization
- Planned vs actual variance

Budget Health should emphasize understanding over judgment.

---

# 14. Household Budgeting

Household budgeting should support:

- Shared categories
- Shared allocations
- Individual spending visibility
- Household totals

Permissions should respect ownership while enabling collaboration.

---

# 15. Relationship to Transactions

Transactions provide actual spending.

Budgets consume categorized transaction data.

Transactions remain the authoritative financial activity.

---

# 16. Relationship to Goals

Budget categories may directly support financial goals.

Examples include:

- Emergency Fund
- Vacation
- New Vehicle
- Home Purchase

Goals track progress.

Budgets track planned funding.

---

# 17. Relationship to Reports

Reports aggregate budget performance over time.

Reports may analyze:

- Budget utilization
- Spending trends
- Variance
- Historical performance

Budgets remain the planning domain.

---

# 18. Relationship to Net Worth

Budget decisions indirectly influence Net Worth through spending, saving, debt reduction, and investing.

Net Worth remains responsible for wealth calculations.

---

# 19. Relationship to the Confidence Engine

Budgets contribute evidence including:

- Planning consistency
- Budget adherence
- Savings allocations
- Overspending frequency
- Financial discipline

Budget performance is only one component of overall financial confidence.

---

# 20. User Experience

The budgeting experience should prioritize:

- Simplicity
- Transparency
- Flexibility
- Fast adjustments
- Explainable calculations
- Positive reinforcement

Users should feel empowered rather than criticized.

---

# 21. Security and Privacy

Budget information contains sensitive financial planning data.

Athena should enforce:

- Owner-scoped authorization
- Household permission validation
- Audit logging
- Secure synchronization
- Protected financial calculations

---

# 22. Future Enhancements

Potential future capabilities include:

- Automatic budget suggestions
- AI budget optimization
- Smart rollovers
- Multi-period forecasting
- Budget scenarios
- Seasonal budgets
- Envelope budgeting views
- Shared household editing
- Budget notifications
- Cash-flow forecasting
- AI coaching
- Confidence-driven recommendations

---

# 23. Product Decisions

## Budgeting Philosophy

Athena follows zero-based budgeting.

---

## Budget Periods

Monthly budgets serve as the initial implementation.

---

## Spending Source

Actual spending is derived exclusively from categorized Transactions.

---

## Adjustments

Users may modify budgets throughout an active period.

---

## Rollovers

Rollovers are planned for a future release.

---

## Household Support

Households may maintain shared budgets while respecting ownership permissions.

---

## Domain Ownership

Budgets own planning.

Transactions own financial activity.

---

# 24. Revision History

| Version | Date       | Author         | Summary                                                                                                                                                                                                                                                                                  |
| ------- | ---------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0.0   | 2026-08-03 | Caitlin Gillum | Established the Budgets product specification defining Athena's zero-based budgeting philosophy, budget lifecycle, planning model, category management, adjustments, overspending, rollovers, household budgeting, domain relationships, user experience principles, and future roadmap. |
