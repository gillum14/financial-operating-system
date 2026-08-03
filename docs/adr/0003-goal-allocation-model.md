# ADR-0XX: Goal Allocation Model

**Project:** Financial Operating System

**Internal Codename:** Athena

**Document Version:** 1.0.0

**Status:** Accepted

**Date:** August 03, 2026

**Owner:** Caitlin Gillum

**Primary Architect:** Caitlin Gillum

**Technical Advisor:** OpenAI ChatGPT

---

# Context

Athena allows users to create financial goals such as:

- Emergency Fund
- Vacation
- Education
- Vehicle Purchase
- Home Purchase
- Retirement

A key architectural decision is determining how money contributes toward goal progress.

Several approaches were considered:

1. Require a dedicated account for every goal.
2. Assume an entire account belongs to a single goal.
3. Track goal progress independently of account balances.
4. Introduce an allocation model separating physical money from financial intent.

Many users keep multiple savings goals within a single savings account, while others spread a single goal across multiple financial accounts or investment vehicles.

The selected model must accurately represent real-world financial behavior without requiring users to restructure their banking relationships.

---

# Decision

Athena will use a **Goal Allocation Model**.

Goals represent financial intent.

Accounts represent where money is physically stored.

Goal progress is calculated from allocations rather than account balances.

Money is never moved when allocating funds to a goal.

Allocations exist only within Athena's internal financial model.

---

# Rationale

This model provides the greatest flexibility while preserving financial accuracy.

It allows:

- One account funding many goals.
- Multiple accounts funding one goal.
- Savings accounts.
- Checking accounts.
- Certificates of Deposit.
- Investment accounts.
- Future supported asset types.

Users are not required to open separate financial accounts for every savings objective.

---

# Principles

## Goals Represent Intent

Goals answer:

> "What is this money for?"

They do not answer:

> "Where is this money stored?"

---

## Accounts Represent Storage

Accounts continue to represent:

- Current balances
- Financial institutions
- Ownership
- Transaction history

Accounts remain independent from goals.

---

## Allocations Represent Purpose

Allocations associate a portion of an account with a financial goal.

Example:

```text
Savings Account
Balance: $10,000

Emergency Fund      $2,000
Vacation            $500
Vehicle             $4,000

Unallocated         $3,500
```

The account balance remains unchanged.

Only Athena's internal allocation ledger changes.

---

## Money Is Never Moved

Creating, editing, or deleting an allocation never performs a banking transaction.

Allocations are purely organizational.

---

## Goal Progress

Goal progress is calculated from allocated value.

```text
Current Goal Value

=

Allocated Funds

+

Verified Contributions

+

Supported Asset Value
```

An account balance alone does not determine goal progress.

---

# Allocation Rules

Athena must enforce the following rules.

## One Dollar May Only Be Allocated Once

A single dollar cannot simultaneously fund multiple goals.

---

## Overallocation Is Prohibited

Total allocations for an account must never exceed its available value.

Example:

```text
Account Balance

$10,000

Goal Allocations

Emergency Fund     $6,000
Vacation           $3,000
Vehicle            $2,000

Total              $11,000
```

This allocation must be rejected.

---

## Unallocated Funds

Every account may contain funds that have not yet been assigned to any goal.

```text
Available to Allocate

=

Current Account Balance

-

Existing Goal Allocations
```

---

## Multiple Funding Sources

Each goal may receive funding from:

- Savings accounts
- Checking accounts
- Certificates of Deposit
- Investment accounts
- Cash
- Manual contributions
- Future supported assets

---

## Multiple Goals Per Account

A single account may support multiple goals simultaneously.

---

# Future Asset Types

The allocation engine is designed to support future financial assets without architectural changes.

Examples include:

- Certificates of Deposit
- Brokerage Accounts
- Retirement Accounts
- Treasury Securities
- Cash Holdings
- Future supported investment products

Each asset contributes value through allocations rather than direct ownership by the goal.

---

# Consequences

## Advantages

- Reflects real-world financial behavior.
- Eliminates the need for separate bank accounts.
- Supports multiple funding sources.
- Supports future investment integrations.
- Simplifies future automation.
- Keeps banking relationships independent from financial planning.

## Tradeoffs

- Requires an allocation ledger.
- Requires validation against overallocation.
- Introduces additional calculation logic.
- Requires clear user interfaces showing allocated and unallocated balances.

These tradeoffs are considered acceptable given the increased flexibility and long-term scalability.

---

# Alternatives Considered

## Dedicated Account Per Goal

Rejected.

This approach forces users to reorganize their banking and does not reflect how many households manage savings.

---

## Entire Account Assigned To One Goal

Rejected.

This prevents a single savings account from supporting multiple financial objectives.

---

## Goal Progress Independent Of Accounts

Rejected.

Manual-only tracking reduces automation opportunities and disconnects goals from actual financial data.

---

# Implementation Notes

The allocation model is expected to introduce concepts similar to:

- Goal
- Goal Funding Source
- Goal Contribution

The exact schema is intentionally deferred until backend implementation.

This ADR establishes architectural behavior rather than database design.

---

# Status

Accepted.

This decision establishes the foundational architecture for Athena's Goals system and should be treated as the authoritative approach for all future goal-related backend, frontend, and product development.

---

# Related Documents

- Product Requirements
- Goals Specification
- Domain Model
- Database Architecture
- Application Architecture

---

# Revision History

| Version | Date       | Author         | Summary                                                                                                                                                                                    |
| ------- | ---------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1.0.0   | 2026-08-03 | Caitlin Gillum | Established the Goal Allocation Model as Athena's foundational architecture for goal funding, separating financial intent from physical account storage through an allocation-based model. |
