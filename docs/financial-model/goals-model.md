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

| State     | Description                                          |
| --------- | ----------------------------------------------------- |
| Draft     | Goal is being configured                              |
| Active    | Goal is actively tracked                               |
| Paused    | Temporarily stopped; expected to resume                |
| Completed | Target reached                                         |
| Archived  | Hidden but preserved                                    |
| Cancelled | User abandoned the goal                                 |

## Implementation Notes

The implemented `GoalStatus` enum is Active, Paused, Completed, Archived — Draft and Cancelled remain conceptual/future (every goal is created directly into Active; a goal the user is no longer pursuing is archived rather than distinguished as "cancelled"). Paused preserves all existing contributions and allocations untouched, accepts no *new* ones until resumed, is excluded from active-goal summary metrics, but still counts toward overall totals. Only an explicit user action moves a goal into or out of Paused.

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

## Implementation Notes

Implemented as a `goal_allocations` table (many-to-many, one record per Goal↔Account pair). "Total allocations cannot exceed available funds" is enforced twice — proactively by the application (a clear error before the write is attempted) and authoritatively by a database trigger that locks the account row and re-validates inside the same transaction, which is what makes the invariant hold even when two allocation requests for the same account arrive at the same moment. Eligible funding sources are Checking, Savings, Cash, Investment, and Retirement accounts, plus CDs (represented as an "other-asset" account in Athena's Accounts model, since CDs have no dedicated account type). Liability accounts and Property are not eligible funding sources.

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

## Implementation Notes

Implemented as `Allocated Amount + Verified Manual Contributions`, divided by Target Amount — Allocated Amount alone understates progress for a goal that also has manual contribution history (e.g. cash gifts never deposited into a linked account), so both recognized-progress sources are summed. The two are tracked as separate ledgers and never merged or double-counted: an allocation claims money that already, verifiably, sits in a real account (validated against that account's balance), while a manual contribution is money the user reported directly. Supported Asset Value (e.g. CD/investment appreciation attributed to a goal) is not yet implemented — see §14 Future Enhancements.

---

# 10. Goal Health

Implemented as a deterministic, explainable rule set — no forecasting engine yet (income, cash flow, and Confidence Score are not inputs at this stage):

- A completed goal is always **Completed**, regardless of pace.
- With a target date: actual progress percent is compared against the percent of the goal's own timeline elapsed, banded by ±10 points — meaningfully ahead is **Excellent**, within the band is **On Track**, meaningfully behind is **Behind**.
- Without a target date: flat thresholds apply (≥75% Excellent, 25–75% On Track, <25% Behind) — there is no pace to compare against.

"Ahead" and "At Risk" from the original four-state list above were consolidated into **Excellent** and **Behind** respectively, since the implemented model has no separate "everything is fine but tight" state between On Track and Behind. Target date and contribution/allocation history are the only implemented inputs; recommended pace, income, cash flow, and Confidence Score remain future enhancements.

---

# 11. Goal Priorities

Goals may optionally be assigned priorities.

Examples:

- Critical
- High
- Medium
- Low

Priority assists recommendation engines but does not affect calculations.

## Implementation Notes

Implemented as three values — High, Medium, Low (no separate Critical tier) — defaulting to Medium, and editable at any time independent of a goal's other fields. Priority is used only for ordering/selection: it is one of four inputs to Upcoming Objective derivation (a High-priority goal with no other more urgent signal generates an objective purely from this tag) and is never itself a formula input to progress, health, or completion. There is no recommendation engine in the current implementation — "assists recommendation engines" above remains a future enhancement.

### Upcoming Objective Derivation

The Dashboard's Upcoming Objectives widget selects up to 4 Active goals via a fixed, deterministic rule set, checked in this order per goal (first match wins, and this order is also the urgency ranking used to sort the final list):

1. Funded to ≥90% of target ("near completion").
2. Computed health is Behind.
3. A target date exists within the next 60 days ("approaching target date").
4. Tagged High priority, with no earlier rule already matching.

Paused, Completed, and Archived goals are never considered — this is a selection over Active goals only. No AI, scoring, or urgency-weighting formula is involved; the same GoalProgress data source `# 9. Progress Calculation` and `# 10. Goal Health` already define is reused, not recomputed independently.

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
| 1.1.0   | 2026-08-07 | Caitlin Gillum | Added Implementation Notes to §7 (Goal Allocation Model), §9 (Progress Calculation), and §10 (Goal Health) resolving previously open questions against the shipped backend: eligible funding-source account types, two-layer overallocation enforcement, the Allocated + Manual progress formula, and the concrete deterministic health rule set (consolidating the four-state Ahead/On Track/Behind/At Risk list into the three implemented states plus Completed). No prior behavior was weakened or reinterpreted. |
| 1.2.0   | 2026-08-07 | Caitlin Gillum | Documented Paused as an implemented Goal Lifecycle state (§3) with Implementation Notes on which states are actually implemented; documented the implemented 3-value Priority field and the deterministic Upcoming Objective derivation rule set (§11 Implementation Notes). |
