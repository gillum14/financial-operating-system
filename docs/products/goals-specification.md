# Goals Specification

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
4. Goal Lifecycle
5. Goal Types
6. Goal Funding Model
7. Allocation Engine
8. Contributions
9. Progress Calculation
10. Validation Rules
11. User Experience Rules
12. Future Enhancements
13. Open Questions
14. Revision History

---

# 1. Purpose

The Goals system enables users to intentionally save toward meaningful financial objectives without requiring separate bank accounts for each goal.

Goals are designed to answer one question:

> **"What is this money for?"**

Unlike traditional budgeting software, Athena separates where money is physically stored from what that money is intended to accomplish.

---

# 2. Product Philosophy

Goals represent intention.

Accounts represent location.

Transactions represent movement.

These concepts must remain independent.

A user may have:

- One account funding many goals.
- Many accounts funding one goal.
- Manual contributions.
- Long-term investments.
- Certificates of Deposit.
- Future investment accounts.

Athena should never require users to reorganize their banking simply to use Goals.

---

# 3. Core Principles

## Goal Progress Is Not Account Balance

Goal progress is calculated from assigned funding sources—not from an account's total balance.

---

## Money Has Purpose

Every dollar may optionally be assigned to a goal.

Money that has not been assigned remains available for future allocation.

---

## One Dollar Can Only Be Assigned Once

A single dollar cannot simultaneously fund multiple goals.

Athena must prevent overallocation.

---

## Physical Money Never Moves

Allocating money to a goal does not move money between accounts.

Allocations exist only within Athena's internal financial model.

---

## Multiple Funding Sources

A goal may receive funding from:

- Savings accounts
- Checking accounts
- Certificates of Deposit
- Investment accounts
- Cash
- Manual contributions
- Future supported assets

---

# 4. Goal Lifecycle

Every goal exists in one of the following states.

## Draft

Created but not actively funded.

---

## Active

Currently receiving funding.

---

## Completed

Goal target achieved.

Users may continue contributing or archive the goal.

---

## Archived

Hidden from normal dashboards while preserving historical information.

---

## Cancelled

No longer being pursued.

Historical contribution history remains available.

---

# 5. Goal Types

Athena will initially support:

- Emergency Fund
- Vacation
- Home Purchase
- Vehicle
- Education
- Retirement
- Debt Payoff
- Wedding
- Medical
- Custom

Future releases may introduce goal-specific recommendations and templates.

---

# 6. Goal Funding Model

Goals are funded through allocations.

Funding sources remain independent from the goals themselves.

### Example

```text
Emergency Fund

Savings Account
Allocated: $2,000

Certificate of Deposit
Allocated: $3,000

Manual Contributions
$500

Total Progress
$5,500
```

Goals may contain:

- One funding source
- Multiple funding sources
- Partial allocations
- Entire account balances

---

# 7. Allocation Engine

The allocation engine tracks how much of every account has been assigned.

### Example

```text
Savings Account

Balance
$10,000

Emergency Fund
$2,000

Family Vacation
$500

New Vehicle
$4,000

Unallocated
$3,500
```

The allocation engine exists independently from banking institutions.

Banks know balances.

Athena knows purpose.

## Allocation Rules

- Allocations may span multiple accounts.
- Multiple goals may reference one account.
- Total allocations cannot exceed available funds.
- Removing an allocation never changes the underlying account balance.
- Moving allocations affects only Athena's internal financial model.

---

# 8. Contributions

Goals support contributions from multiple sources.

Examples include:

- Manual contribution
- Account allocation
- Automatic transfer
- Investment growth
- CD maturity
- Future payroll automation

Contribution history should remain permanently auditable.

---

# 9. Progress Calculation

Progress is calculated from allocated value.

```text
Progress %

=
Current Goal Value
/
Goal Target
```

Current Goal Value equals:

```text
Allocated Funds

+

Verified Contributions

+

Supported Asset Value
```

Account balances alone do not determine progress.

---

# 10. Validation Rules

The Goals engine must enforce:

- No negative goal values.
- No allocations exceeding available balances.
- Goals require a positive target amount.
- Target dates cannot precede creation.
- Archived goals cannot receive new contributions.
- Completed goals may continue receiving contributions if enabled.

---

# 11. User Experience Rules

Athena should always distinguish between:

- Total account balance
- Allocated amount
- Remaining available funds

Users should always understand:

- Where money physically exists.
- Which goals are funded.
- Which dollars remain unassigned.

Goal management should never create confusion about actual bank balances.

---

# 12. Future Enhancements

Future releases may introduce:

## Automatic Allocation Rules

Examples:

- Allocate 10% of every paycheck.
- Round up purchases.
- Allocate tax refunds.
- Monthly recurring contributions.

---

## Certificates of Deposit

Support:

- Principal
- APY
- Interest earned
- Maturity date
- Auto-renew
- Early withdrawal penalties.

---

## Investment Funding

Support investment-backed goals including:

- Brokerage accounts
- ETFs
- Mutual funds
- Retirement accounts

---

## Goal Forecasting

Estimate:

- Expected completion date.
- Required monthly contribution.
- Impact of contribution increases.
- Confidence of completion.

---

## AI Recommendations

Examples:

- Reallocate unused savings.
- Recommend faster funding.
- Detect stalled goals.
- Suggest contribution adjustments.

---

# 13. Open Questions

The following items remain under product discussion.

## Partial Investment Allocation

Can only part of an investment account fund a goal?

---

## Interest Attribution

Should CD interest automatically increase goal progress?

---

## Investment Appreciation

Should unrealized gains count toward goal completion?

---

## Shared Goals

Should multiple household members contribute to the same goal?

---

## Goal Priorities

Should Athena recommend funding higher-priority goals before lower-priority ones?

---

## Automatic Rebalancing

Should Athena automatically move excess allocations after goals are completed?

---

# Revision History

| Version | Date       | Author         | Summary                                                                                                                                                                                                                                      |
| ------- | ---------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0.0   | 2026-08-03 | Caitlin Gillum | Established the Goals product specification, defining the product philosophy, allocation engine, funding model, goal lifecycle, progress calculation, validation rules, future roadmap, and foundational behavior for Athena's Goals system. |
