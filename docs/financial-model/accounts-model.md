# Accounts Model

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
4. Financial Institution
5. Account
6. Account Balance
7. Account Connection
8. Account Synchronization
9. Account Health
10. Ownership Model
11. Account Visibility
12. Account Lifecycle
13. Data Freshness
14. Relationship to Transactions
15. Relationship to Budgets
16. Relationship to Net Worth
17. Relationship to Investments
18. Relationship to Retirement
19. Relationship to the Confidence Engine
20. Safety and Validation Rules
21. Future Enhancements
22. Revision History

---

# 1. Purpose

The Accounts domain is the authoritative source for every financial account within Athena.

It models:

- Financial institutions
- Connected accounts
- Manual accounts
- Account balances
- Synchronization state
- Connection health
- Ownership
- Visibility
- Lifecycle

Every other financial domain references Accounts rather than maintaining its own copy of account information.

---

# 2. Design Philosophy

The Accounts domain follows several guiding principles.

## Single Source of Truth

Every account exists exactly once.

Balances, ownership, synchronization, and identity originate here.

---

## Provider Independent

The domain should support:

- Connected providers
- Manual accounts
- Future providers

without changing the surrounding architecture.

---

## Explainable

Every balance should identify:

- Source
- Synchronization state
- Freshness
- Ownership
- Institution

---

## Flexible

The model should support:

- Consumer banking
- Credit products
- Loans
- Investments
- Retirement
- Manual assets
- Manual liabilities
- Future financial products

---

## Extensible

Adding a new account type or provider should require minimal architectural change.

---

# 3. Core Entities

The Accounts domain contains the following primary entities.

## Financial Institution

Represents a connected financial institution.

---

## Account

Represents a financial account.

---

## Account Balance

Represents the current financial position of an account.

---

## Account Connection

Represents provider authentication and connection status.

---

## Synchronization

Represents provider synchronization metadata.

---

## Account Health

Represents operational quality.

---

## Ownership

Represents who owns an account.

---

## Visibility

Represents presentation and calculation preferences.

---

# 4. Financial Institution

A Financial Institution represents the source of one or more connected accounts.

Each institution may contain:

- Institution ID
- Provider identifier
- Display name
- Logo reference
- Provider name
- Country
- Supported products
- Connection status
- Created timestamp
- Updated timestamp

Institutions do not own balances.

Accounts remain the financial records.

---

# 5. Account

An Account represents a financial asset or liability.

Each account may contain:

- Account ID
- Owner ID
- Institution ID (optional)
- Display name
- Account type
- Account subtype
- Currency
- Connected or manual flag
- Ownership reference
- Visibility reference
- Lifecycle status
- Created timestamp
- Updated timestamp

Supported account categories include:

Assets

- Checking
- Savings
- Cash
- Money Market
- Brokerage
- Retirement
- Real Estate
- Vehicle
- Property
- Business
- Investment
- Manual Asset

Liabilities

- Credit Card
- Mortgage
- HELOC
- Auto Loan
- Student Loan
- Personal Loan
- Business Loan
- Manual Liability

Each account maintains a single canonical identity.

---

# 6. Account Balance

Account Balance represents the latest known balance.

Each balance record may include:

- Balance ID
- Account ID
- Current balance
- Available balance
- Currency
- Balance timestamp
- Source
- Freshness
- Created timestamp

Balance values should never be duplicated elsewhere.

Historical balances belong to future snapshot domains.

---

# 7. Account Connection

Connected accounts maintain provider metadata.

Each connection may contain:

- Connection ID
- Institution ID
- Provider account identifier
- Authentication status
- Connection status
- Last successful authentication
- Last failed authentication
- Reauthentication required
- Created timestamp
- Updated timestamp

Manual accounts do not require Account Connections.

---

# 8. Account Synchronization

Synchronization represents provider communication.

Synchronization metadata may include:

- Synchronization ID
- Account ID
- Last successful sync
- Last attempted sync
- Synchronization result
- Retry count
- Error code
- Error message
- Refresh strategy

Synchronization metadata supports diagnostics.

It does not alter account balances directly.

---

# 9. Account Health

Account Health summarizes operational condition.

Possible states include:

- Healthy
- Synchronizing
- Delayed
- Needs Attention
- Reauthentication Required
- Provider Unavailable
- Archived

Health reflects operational quality only.

Financial health remains outside this domain.

---

# 10. Ownership Model

Each account defines ownership.

Supported ownership types include:

- Individual
- Joint
- Household
- Percentage Shared (future)

Ownership records may include:

- Ownership ID
- Owner IDs
- Ownership type
- Visibility permissions
- Sharing permissions

Ownership affects aggregation in downstream domains.

---

# 11. Account Visibility

Visibility controls presentation without changing ownership.

Visibility may include:

- Visible
- Hidden
- Included in calculations
- Excluded from calculations

Visibility preferences should remain independent from synchronization.

---

# 12. Account Lifecycle

Accounts move through defined lifecycle states.

Supported states include:

- Creating
- Connecting
- Active
- Synchronizing
- Needs Attention
- Disconnected
- Archived

Lifecycle reflects operational state.

It does not describe account balance or financial performance.

---

# 13. Data Freshness

Each account maintains freshness metadata.

Possible freshness values include:

- Live
- Recently Synced
- Delayed
- Stale
- Manual
- Unknown

Freshness should always be displayed independently from account health.

An account may be healthy while its displayed balance is delayed.

---

# 14. Relationship to Transactions

Accounts remain authoritative for:

- Account identity
- Institution
- Ownership
- Balances

Transactions reference Accounts when recording:

- Source account
- Destination account
- Running balances
- Account presentation

Transactions own categorization and transaction lifecycle.

---

# 15. Relationship to Budgets

Budgets do not consume balances directly.

Budgets consume categorized spending derived from Transactions.

Accounts simply provide the financial containers from which transactions originate.

---

# 16. Relationship to Net Worth

Accounts provide canonical balances.

The Net Worth domain consumes:

- Asset balances
- Liability balances
- Ownership
- Visibility
- Inclusion status

Net Worth performs aggregation.

Accounts remain authoritative for balances.

---

# 17. Relationship to Investments

Investment accounts originate here.

The Investments domain owns:

- Holdings
- Asset allocation
- Performance
- Cost basis
- Market valuation
- Investment analytics

Accounts own account identity and synchronization.

---

# 18. Relationship to Retirement

Retirement accounts originate here.

The Retirement domain consumes:

- Account balances
- Account ownership
- Retirement account metadata

Retirement owns:

- Projections
- Readiness
- Contribution planning
- Withdrawal modeling

---

# 19. Relationship to the Confidence Engine

The Accounts domain contributes evidence including:

- Account coverage
- Synchronization quality
- Connection reliability
- Data freshness
- Institution health

The Confidence Engine evaluates these alongside broader financial evidence.

Accounts never calculate confidence directly.

---

# 20. Safety and Validation Rules

The Accounts model should enforce:

- Owner-scoped access
- One canonical account identity
- One canonical balance
- Valid institution references
- Valid ownership references
- Valid synchronization state
- Explicit freshness
- Explicit lifecycle
- Explicit visibility
- Currency consistency

Athena must never:

- Duplicate balances
- Duplicate accounts
- Hide synchronization failures
- Present stale balances as current
- Expose unauthorized accounts
- Infer ownership automatically

Unknown states should fail safely.

---

# 21. Future Enhancements

Future capabilities may include:

- Multi-provider aggregation
- Business financial accounts
- Multi-currency support
- Duplicate account detection
- Institution health scoring
- Shared household ownership percentages
- Offline synchronization
- Smart account grouping
- AI-powered account diagnostics
- Historical balance snapshots
- Connection analytics

---

# 22. Revision History

| Version | Date       | Author         | Summary                                                                                                                                                                                                                                                                                                      |
| ------- | ---------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1.0.0   | 2026-08-03 | Caitlin Gillum | Established the canonical Accounts domain model defining financial institutions, accounts, balances, provider connections, synchronization, operational health, ownership, visibility, lifecycle, data freshness, relationships to downstream financial domains, validation rules, and future extensibility. |
