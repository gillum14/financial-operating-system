# Accounts Specification

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
4. Supported Account Types
5. Connected and Manual Accounts
6. Financial Institutions
7. Account Lifecycle
8. Balance Management
9. Synchronization
10. Data Freshness
11. Account Health
12. Household Ownership
13. Account Visibility
14. Archived Accounts
15. Relationship to Transactions
16. Relationship to Budgets
17. Relationship to Net Worth
18. Relationship to Investments
19. Relationship to Retirement
20. Relationship to the Confidence Engine
21. User Experience
22. Security and Privacy
23. Future Enhancements
24. Product Decisions
25. Revision History

---

# 1. Purpose

The Accounts domain serves as Athena's financial foundation.

Every connected or manually managed financial account originates within the Accounts domain before being referenced by other financial systems.

Accounts answer three fundamental questions:

- What financial accounts exist?
- What are their current balances?
- How healthy and trustworthy is their data?

The Accounts page is intentionally not a banking application.

Its purpose is to organize financial accounts into a trustworthy, explainable financial inventory.

---

# 2. Product Philosophy

Accounts should be:

- Comprehensive
- Explainable
- Accurate
- Transparent
- Easy to understand

Athena should never overwhelm users with institution-specific complexity.

Instead, Accounts should provide a clean abstraction layer that powers the remainder of the platform.

Users should always understand:

- Where an account came from
- Whether it is connected or manual
- When it last synchronized
- Whether Athena trusts the displayed balance
- Whether attention is required

---

# 3. Core Principles

## Single Source of Truth

Every financial account should exist only once.

Other domains reference Accounts rather than duplicating account information.

---

## Connection Agnostic

The Accounts domain should support:

- Connected financial institutions
- Manual accounts
- Future provider integrations

without changing the user experience.

---

## Honest

Athena must clearly distinguish:

- Connected balances
- Manual balances
- Estimated values
- Stale information
- Synchronization failures

---

## Explainable

Every displayed balance should identify:

- Source
- Freshness
- Synchronization status
- Ownership
- Institution

---

## Extensible

New account types and providers should be introduced without redesigning the Accounts experience.

---

# 4. Supported Account Types

Supported account categories include:

## Cash

- Checking
- Savings
- Money Market
- Cash

## Credit

- Credit Card
- Charge Card
- Line of Credit

## Loans

- Mortgage
- HELOC
- Home Equity Loan
- Auto Loan
- Student Loan
- Personal Loan
- Business Loan

## Investments

- Brokerage
- IRA
- Roth IRA
- 401(k)
- 403(b)
- 457
- TSP
- HSA Investment
- Mutual Fund
- Certificate of Deposit

## Property

- Real Estate
- Vehicle
- Personal Property
- Business Ownership

## Other

- Manual Asset
- Manual Liability
- Other User-Defined Accounts

The supported catalog should expand over time without requiring architectural changes.

---

# 5. Connected and Manual Accounts

Athena supports two primary account sources.

## Connected Accounts

Connected accounts synchronize from supported financial providers.

Characteristics include:

- Automatic balance updates
- Automatic transaction synchronization
- Institution metadata
- Connection health monitoring
- Synchronization history

---

## Manual Accounts

Manual accounts are fully managed by the user.

Examples include:

- Cash
- Property
- Vehicles
- Private loans
- Family assets
- Other unsupported financial institutions

Manual accounts should support:

- Custom balances
- Manual updates
- Notes
- Custom naming
- Optional reminders to review values

Athena should clearly distinguish manual accounts from connected accounts.

---

# 6. Financial Institutions

Financial institutions represent the source of connected accounts.

Institution information may include:

- Institution name
- Institution logo
- Provider identifier
- Connection status
- Number of connected accounts
- Last successful synchronization
- Last synchronization attempt

Institution records should not own balances.

Balances remain owned by individual accounts.

---

# 7. Account Lifecycle

Accounts progress through several lifecycle states.

Possible states include:

- Connecting
- Active
- Synchronizing
- Needs Attention
- Disconnected
- Archived

Lifecycle state should describe operational status rather than financial health.

---

# 8. Balance Management

Each account maintains a canonical balance.

Balance presentation should include:

- Current balance
- Available balance (when supported)
- Balance date
- Balance source
- Currency

Athena should never invent balances.

If a balance is unavailable, Athena should communicate that clearly rather than displaying misleading values.

---

# 9. Synchronization

Synchronization keeps connected accounts current.

Synchronization should include:

- Automatic provider refresh
- Manual refresh requests
- Failure detection
- Retry handling
- Error reporting

Athena should surface synchronization issues without requiring users to investigate provider-specific errors.

---

# 10. Data Freshness

Every connected account should expose freshness information.

Possible freshness states include:

- Live
- Recently Synced
- Delayed
- Stale
- Unknown
- Manual

Users should always know how current displayed balances are.

---

# 11. Account Health

Account Health summarizes whether an account requires attention.

Examples include:

- Healthy
- Needs Reauthentication
- Synchronization Failed
- Manual Review Recommended
- Provider Unavailable

Health should communicate operational quality rather than financial quality.

---

# 12. Household Ownership

Accounts may belong to:

- Individual
- Joint
- Household

Future versions may support more advanced ownership percentages.

Household accounts should respect visibility permissions.

---

# 13. Account Visibility

Users may control whether accounts are:

- Visible
- Hidden
- Included in calculations
- Excluded from calculations

Visibility should not delete or disconnect the underlying account.

---

# 14. Archived Accounts

Accounts that are no longer active may be archived.

Archiving should:

- Preserve history
- Preserve transactions
- Preserve reports
- Preserve historical Net Worth
- Exclude the account from future synchronization

Archived accounts remain available for historical reporting.

---

# 15. Relationship to Transactions

Accounts own transaction history.

The Transactions domain references Accounts when displaying:

- Source account
- Destination account
- Running balances
- Institution information

Transaction categorization remains owned by the Transactions domain.

---

# 16. Relationship to Budgets

Budgets consume spending derived from Transactions rather than Accounts directly.

Accounts provide the financial sources that ultimately fund budgets.

---

# 17. Relationship to Net Worth

Accounts provide canonical balances used by the Net Worth domain.

Net Worth determines:

- Inclusion
- Ownership aggregation
- Asset/liability classification
- Net Worth calculations

Accounts remain authoritative for balances.

---

# 18. Relationship to Investments

Investment accounts originate within Accounts.

The Investments domain owns:

- Holdings
- Asset allocation
- Cost basis
- Investment performance

Accounts own the account itself.

---

# 19. Relationship to Retirement

Retirement accounts originate within Accounts.

The Retirement domain owns:

- Retirement projections
- Retirement readiness
- Contribution planning
- Withdrawal modeling

Accounts remain responsible for balances and synchronization.

---

# 20. Relationship to the Confidence Engine

Accounts provide evidence to the Confidence Engine including:

- Connection reliability
- Account completeness
- Data freshness
- Account coverage
- Synchronization quality

The Confidence Engine evaluates these signals alongside broader financial evidence.

---

# 21. User Experience

Users should immediately understand:

- Total assets
- Total liabilities
- Net account position
- Connected institutions
- Accounts requiring attention
- Synchronization health
- Account freshness

The Accounts page should function as the user's financial inventory.

---

# 22. Security and Privacy

Accounts contain highly sensitive financial information.

Athena should enforce:

- Owner-scoped authorization
- Household permission validation
- Secure provider authentication
- Encrypted credentials
- Secure synchronization
- Audit logging

Athena should never expose account information to unauthorized users.

---

# 23. Future Enhancements

Future capabilities may include:

- Multiple financial providers
- Business accounts
- International institutions
- Multi-currency accounts
- Automatic duplicate detection
- Institution health monitoring
- Smart account grouping
- Household account invitations
- AI-powered account review
- Connection analytics
- Offline synchronization

---

# 24. Product Decisions

## Account Sources

Athena supports both connected and manual accounts.

## Synchronization

Connected accounts synchronize automatically when supported by providers.

## Manual Accounts

Manual accounts remain fully user-controlled.

## Account Health

Health reflects synchronization quality, not financial quality.

## Data Freshness

Every account displays freshness information appropriate to its source.

## Household Ownership

Accounts support individual and household ownership models.

## Archive Behavior

Archived accounts preserve history while leaving active financial calculations.

## Domain Ownership

Accounts remain the canonical source for balances, institutions, synchronization, and account identity.

---

# 25. Revision History

| Version | Date       | Author         | Summary                                                                                                                                                                                                                                                                                                                            |
| ------- | ---------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0.0   | 2026-08-03 | Caitlin Gillum | Established the Accounts product specification defining supported account types, connected and manual accounts, institutions, synchronization, balance management, account lifecycle, account health, ownership, visibility, archival behavior, relationships to other financial domains, security principles, and future roadmap. |
