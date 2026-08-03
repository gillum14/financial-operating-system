# Goals Model

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
3. Goal Lifecycle
4. Goal Types
5. Goal Structure
6. Funding Sources
7. Goal Allocation Model
8. Contributions
9. Progress Calculation
10. Goal Health
11. Goal Priorities
12. Milestones
13. Goal Completion
14. Future Enhancements
15. Revision History

---

# 1. Purpose

The Goals system allows users to intentionally allocate portions of their wealth toward future objectives rather than viewing savings as a single undifferentiated balance.

Goals transform money into purpose.

Instead of asking:

> "How much money do I have?"

Athena encourages users to ask:

> "What is my money accomplishing?"

---

# 2. Design Philosophy

The Goals system is built around several guiding principles.

## Intentional

Every dollar should have a purpose.

## Flexible

Money may be allocated across multiple goals regardless of where it is physically stored.

## Honest

Goal progress represents user allocations—not actual legal account segregation.

## Independent

Goals are independent from financial accounts.

Accounts store money.

Goals assign purpose.

---

# 3. Goal Lifecycle

Each goal exists in one of the following states.

| State     | Description              |
| --------- | ------------------------ |
| Draft     | Goal is being configured |
| Active    | Goal is actively tracked |
| Completed | Target reached           |
| Archived  | Hidden but preserved     |
| Cancelled | User abandoned the goal  |

---

# 4. Goal Types

Athena ships with common templates while allowing unlimited custom goals.

Examples include:

- Emergency Fund
- Vacation
- Home Purchase
- Vehicle
- Education
- Retirement
- Wedding
- Baby
- Debt Payoff
- Investment
- Business
- Electronics
- Health
- Custom

Goal types primarily provide icons, suggested defaults, and recommendations.

They do not change the underlying model.

---

# 5. Goal Structure

Each goal contains:

- Name
- Description
- Goal Type
- Target Amount
- Current Allocated Amount
- Target Date (optional)
- Priority
- Status
- Notes
- Created Date
- Completion Date

---

# 6. Funding Sources

A goal may reference one or more funding sources.

Examples include:

- Checking
- Savings
- Certificate of Deposit (CD)
- Brokerage Account
- Investment Account
- Cash
- Other Assets

Funding sources provide transparency but do not own the allocation.

---

# 7. Goal Allocation Model

Athena separates physical account balances from intentional allocations.

Example:

Savings Account

$10,000

User Allocations

- Emergency Fund — $4,000
- Vacation — $2,000
- New Car — $3,000
- Christmas — $1,000

The account still contains $10,000.

Athena simply records how the user intends to use those dollars.

A single funding source may support multiple goals.

A single goal may also receive allocations from multiple funding sources.

This many-to-many relationship provides maximum flexibility while accurately reflecting real-world financial behavior.

---

# 8. Contributions

Goals may receive contributions through multiple methods.

### Manual

User explicitly allocates money.

### Automatic

Recurring transfers.

### Windfalls

Bonuses, tax refunds, gifts.

### Future

Future releases may support:

- Round-ups
- AI recommendations
- Mission rewards
- Automatic surplus allocation

---

# 9. Progress Calculation

Progress is calculated as:

Allocated Amount ÷ Target Amount

Example

Target

$20,000

Allocated

$8,000

Progress

40%

Progress reflects intentional allocations rather than raw account balances.

---

# 10. Goal Health

Future versions of Athena may classify goals as:

- On Track
- Ahead
- Behind
- At Risk

Health calculations may consider:

- Target date
- Contribution history
- Recommended pace
- Income
- Cash flow
- Confidence Score

---

# 11. Goal Priorities

Goals may optionally be assigned priorities.

Examples:

- Critical
- High
- Medium
- Low

Priority assists recommendation engines but does not affect calculations.

---

# 12. Milestones

Goals may define intermediate milestones.

Example:

Emergency Fund

- $1,000
- One Month Expenses
- Three Months
- Six Months
- Fully Funded

Milestones provide additional motivation and enable mission-based rewards.

---

# 13. Goal Completion

A goal is considered complete when:

Allocated Amount ≥ Target Amount

Completion may trigger:

- Celebration
- Confidence Score increase
- Mission completion
- AI recommendations for the next goal

---

# 14. Future Enhancements

Planned capabilities include:

- Shared household goals
- Child goals
- Goal forecasting
- Contribution projections
- Automatic surplus allocation
- Investment-linked goals
- Goal scenarios
- Windfall allocation wizard
- Goal recommendations
- AI prioritization
- Goal templates
- Goal duplication
- Retirement planning integration

---

# 15. Revision History

| Version | Date       | Author         | Summary                                                                                                                                                                               |
| ------- | ---------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0.0   | 2026-08-03 | Caitlin Gillum | Established the canonical Goals domain model, including lifecycle, allocation philosophy, funding sources, progress calculations, milestones, priorities, and future expansion plans. |
