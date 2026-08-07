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

## Paused

Deliberately, temporarily stopped — distinct from Cancelled ("no longer being pursued") and Archived ("put away"). A Paused goal is expected to resume.

Remains fully visible everywhere Active goals are. All existing contributions and allocations are preserved exactly as they were; only *new* contributions and allocations are refused while paused.

Excluded from active-goal summary metrics (e.g. "On Track" counts) while paused, but still counted in overall totals (Total Goals, Total Saved) — the money already committed to it is still real.

Resumes back to Active only through an explicit user action; nothing pauses or resumes a goal automatically.

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

## Implementation Notes

The backend implements four of the five states above as `GoalStatus`: Active, Paused, Completed, Archived. Draft and Cancelled remain conceptual/future — every goal in the current implementation is created directly into Active (there is no configuration-in-progress Draft state), and there is no separate Cancelled state distinct from Archived (a goal the user is no longer pursuing is archived, not cancelled). Paused sits between Active and Completed in the transition graph: Active ⇄ Paused (pause/resume), and Active, Paused, or Completed → Archived. A Paused goal cannot be completed directly — it must resume to Active first, since completion is meant to reflect an active pursuit reaching its target, not a stalled one.

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

## Implementation Notes

Resolved by the backend implementation (`goal_allocations` table; see `docs/architecture/domain-model.md` § Implementation: Goals Schema, Allocation Model, and Scope):

- **Eligible funding-source account types**: Checking, Savings, Cash, Investment, and Retirement accounts, plus CDs (which have no dedicated account type in Athena's Accounts model and are represented as an "other-asset" account). Liability accounts (credit cards, loans, mortgages) and Property are never eligible — a liability has no positive available balance to allocate, and Property is treated as illiquid with no "available balance" concept in the current Accounts model.
- **"Total allocations cannot exceed available funds"** is enforced at two layers: proactively in the application layer (a clear, actionable error before the write), and authoritatively by a database trigger that locks the funding account's row and re-validates inside the same write transaction — this is what actually prevents two simultaneous allocation requests from both succeeding past the same balance; an application-only check cannot.
- **One allocation record per (Goal, Account) pair.** Allocating a second time from the same account to the same goal edits the existing allocation rather than creating a second one — this keeps "how much of Account X funds Goal Y" a single, unambiguous number rather than a sum the UI has to reconstruct from history.
- An account must be **active** (not archived) to receive a new allocation. Existing allocations against an account that is later archived are left untouched — archiving hides an account going forward, it never retroactively unwinds funding already recorded against it.

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

## Implementation Notes

Allocated Funds and Verified Contributions are implemented as two structurally separate ledgers (`goal_allocations` and `goal_contributions`) that are summed, never merged or de-duplicated at read time: an allocation is a claim against money that already, verifiably, sits in a real account (so it can never double-count — the same trigger that enforces "no allocations exceeding available balances" makes this structural), while a manual contribution is a user-reported entry for money not tracked in any linked account. Because the two are disjoint by construction, no dollar can appear in both, and the current implementation never needs a runtime "is this contribution already represented by an allocation?" check. Supported Asset Value (e.g. CD/investment appreciation attributed to a goal) is not yet implemented — see §12 Future Enhancements.

---

# 10. Validation Rules

The Goals engine must enforce:

- No negative goal values.
- No allocations exceeding available balances.
- Goals require a positive target amount.
- Target dates cannot precede creation.
- Archived goals cannot receive new contributions.
- Completed goals may continue receiving contributions if enabled.
- Paused goals cannot receive new contributions or new allocations — existing ones are untouched.

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

## Implementation Notes: Priority and Upcoming Objectives

**Priority** is a simple, editable field (High, Medium, Low; defaults to Medium) used only for ordering and selection — it does not drive a scoring or urgency formula, and it does not affect progress, health, or completion in any way.

**Upcoming Objectives** (surfaced on the Dashboard) are derived, not manually curated or AI-generated — a fixed, explainable rule set selects a small number of Active goals that most need attention right now:

1. **Near completion** — funded to 90% or more of target. Reason shown: "N% funded — almost there."
2. **Behind pace** — the goal's own computed health is Behind. Reason shown: "Behind pace toward its target date."
3. **Approaching target date** — a target date exists and falls within the next 60 days. Reason shown: "Target date in N days."
4. **High priority** — tagged High priority, with no other more urgent signal already selected it. Reason shown: "Marked as a high priority goal."

Each goal is checked against these four rules in the order above; the first one that matches is the only reason used, so a goal never produces more than one objective, and the check order doubles as the urgency ranking used to sort and cap the final list (capped at 4). Paused, Completed, and Archived goals never generate an objective — Paused because the user deliberately chose not to be working on it right now, Completed/Archived because there is nothing left to work toward.

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
| 1.1.0   | 2026-08-07 | Caitlin Gillum | Added Implementation Notes to §7 (Allocation Engine) and §9 (Progress Calculation) resolving previously open questions against the shipped backend: the exact eligible funding-source account types, the two-layer (application + database trigger) overallocation enforcement, the one-allocation-per-(Goal,Account) record design, and how Allocated Funds and Verified Contributions are kept structurally non-overlapping. No prior behavior was weakened or reinterpreted. |
| 1.2.0   | 2026-08-07 | Caitlin Gillum | Documented Paused as an implemented Goal Lifecycle state (§4) with its own Implementation Notes clarifying which of the five conceptual states (Draft, Active, Paused, Completed, Archived, Cancelled) are currently implemented; added the Paused funding restriction to §10 Validation Rules; documented Priority and the deterministic Upcoming Objective selection rules (§11 Implementation Notes). |
