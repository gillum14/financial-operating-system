# Net Worth Model

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
4. Net Worth Profile
5. Assets
6. Liabilities
7. Real Estate
8. Ownership
9. Inclusion Rules
10. Net Worth Calculation
11. Liquidity Classification
12. Valuation Model
13. Historical Snapshots
14. Goals and Milestones
15. Relationship to Investments
16. Relationship to Retirement
17. Relationship to Goals
18. Relationship to the Confidence Engine
19. Safety and Validation Rules
20. Future Enhancements
21. Revision History

---

# 1. Purpose

The Net Worth domain models a user's complete financial position by aggregating included assets and liabilities into a single explainable financial statement.

The model enables Athena to:

- Aggregate assets
- Aggregate liabilities
- Calculate Total Net Worth
- Calculate Liquid Net Worth
- Calculate Real Estate Equity
- Preserve historical snapshots
- Track Net Worth growth
- Track Net Worth milestones
- Provide evidence to the Confidence Engine

The Net Worth domain is a calculation and reporting system.

It does not own the authoritative balances of connected financial accounts, investments, or retirement accounts.

---

# 2. Design Philosophy

The Net Worth model follows several core principles.

## Single Source of Truth

Every asset and liability should have one authoritative representation.

The Net Worth domain aggregates values rather than duplicating financial records maintained elsewhere.

---

## Explainable

Every reported value should be reproducible from:

- Included assets
- Included liabilities
- Ownership scope
- Valuation source
- Calculation version
- Snapshot date

---

## Flexible

Users should be able to include:

- Connected accounts
- Manual assets
- Manual liabilities
- Shared assets
- Household assets
- Complex ownership structures

without changing the underlying calculation model.

---

## User Controlled

Users decide:

- Inclusion
- Ownership
- Valuation method
- Manual values
- Household visibility

Athena supplies defaults but never forces financial assumptions.

---

## Snapshot Driven

Historical Net Worth is derived from immutable stored snapshots rather than recalculated using today's data.

---

# 3. Core Entities

The Net Worth domain consists of the following primary entities.

## NetWorthProfile

Represents user preferences affecting Net Worth calculations.

---

## Asset

Represents an included or excluded financial asset.

---

## Liability

Represents an included or excluded financial obligation.

---

## RealEstateAsset

Represents real property together with associated secured debt.

---

## Ownership

Represents who owns an asset or liability.

---

## Valuation

Represents the current value and its supporting metadata.

---

## NetWorthSnapshot

Represents an immutable historical Net Worth calculation.

---

## NetWorthGoal

Represents a desired future Net Worth target.

---

## NetWorthMilestone

Represents an achieved historical milestone.

---

# 4. Net Worth Profile

Each owner may have one Net Worth profile.

The profile may include:

- Profile ID
- Owner ID
- Default ownership scope
- Default household view
- Liquid asset preferences
- Default inclusion settings
- Preferred currency
- Snapshot preferences
- Reminder preferences
- Created timestamp
- Updated timestamp

The profile controls presentation.

It does not own financial balances.

---

# 5. Assets

Assets represent things owned that contribute value.

Supported categories include:

- Cash
- Checking
- Savings
- Money Market
- CD
- Brokerage
- Retirement
- Stocks
- ETFs
- Mutual Funds
- Bonds
- Treasury Securities
- Cryptocurrency
- Real Estate
- Vehicles
- Business Ownership
- Personal Property
- Collectibles
- Precious Metals
- Employee Equity
- Other

Each asset may contain:

- Asset ID
- Owner ID
- Name
- Asset category
- Provider account reference
- Manual asset flag
- Ownership reference
- Current valuation
- Valuation source
- Valuation confidence
- Last updated timestamp
- Include in Net Worth
- Include in Liquid Net Worth
- Notes

Assets remain authoritative within their originating domains whenever possible.

---

# 6. Liabilities

Liabilities represent financial obligations.

Supported categories include:

- Mortgage
- HELOC
- Home Equity Loan
- Auto Loan
- Credit Card
- Student Loan
- Personal Loan
- Medical Debt
- Tax Liability
- Business Loan
- Other

Each liability may include:

- Liability ID
- Owner ID
- Name
- Liability type
- Current balance
- Interest rate
- Connected provider
- Manual liability flag
- Ownership reference
- Include in Net Worth
- Notes
- Last updated timestamp

---

# 7. Real Estate

Real estate is modeled as an asset with linked secured liabilities.

A Real Estate Asset may contain:

- Property ID
- Owner ID
- Address
- Property type
- Current estimated value
- Valuation source
- Valuation confidence
- Associated mortgage IDs
- Associated HELOC IDs
- Purchase date
- Purchase price
- Include in Net Worth
- Notes

Estimated Equity is calculated as:

```text
Property Value
− Associated Secured Debt
= Estimated Equity
```

The linked liabilities remain separate financial records.

---

# 8. Ownership

Every asset and liability must define ownership.

Supported ownership types include:

- Individual
- Joint
- Household
- Percentage Shared

Ownership records may contain:

- Ownership ID
- Owner IDs
- Ownership type
- Percentage
- Household visibility
- Sharing permissions

Ownership affects aggregation.

It does not duplicate financial records.

---

# 9. Inclusion Rules

Every eligible item maintains independent inclusion settings.

Possible states include:

- Included
- Excluded

Future versions may support conditional inclusion.

Exclusion removes an item from Net Worth calculations while preserving:

- History
- Provider synchronization
- Reporting
- Audit trail

---

# 10. Net Worth Calculation

Total Net Worth is calculated as:

```text
Included Assets
− Included Liabilities
= Total Net Worth
```

Additional derived values include:

## Asset Total

```text
Sum of Included Assets
```

## Liability Total

```text
Sum of Included Liabilities
```

## Real Estate Equity

```text
Property Values
− Secured Debt
```

## Retirement Assets

```text
Sum of Included Retirement Assets
```

## Liquid Net Worth

```text
Included Liquid Assets
− Short-Term Liabilities
```

Calculations must:

- Prevent double counting
- Respect ownership
- Respect exclusions
- Remain deterministic
- Preserve calculation version

---

# 11. Liquidity Classification

Each asset should define liquidity.

Possible classifications include:

- Immediate
- Near Liquid
- Long-Term
- Restricted
- Illiquid
- Unknown

Examples:

Immediate

- Cash
- Checking

Near Liquid

- Savings
- Money Market

Long-Term

- Retirement

Illiquid

- Real Estate
- Business Ownership

Liquidity classifications determine Liquid Net Worth calculations.

---

# 12. Valuation Model

Every asset valuation contains both freshness and confidence.

## Valuation Sources

Possible sources include:

- Connected Provider
- Market Data
- Manual Entry
- Automated Estimate
- Formal Appraisal
- Purchase Price
- Other

---

## Freshness

Possible values:

- Current
- Recent
- Stale
- Very Stale
- Unknown

---

## Confidence

Possible values:

- Verified
- Estimated
- Manual
- Unknown

Freshness and confidence are independent properties.

Every valuation should contain:

- Value
- Currency
- Source
- Confidence
- Freshness
- Last updated timestamp
- Calculation version

---

# 13. Historical Snapshots

Snapshots preserve historical Net Worth.

Snapshot types include:

## Monthly Snapshot

Created automatically at month end.

---

## Material Event Snapshot

Created after events such as:

- Major asset purchase
- Major asset sale
- Liability payoff
- Requested snapshot
- Household ownership change
- Significant inheritance

Each snapshot contains:

- Snapshot ID
- Snapshot date
- Owner scope
- Included assets
- Included liabilities
- Asset total
- Liability total
- Net Worth
- Liquid Net Worth
- Retirement assets
- Real Estate equity
- Calculation version
- Data freshness summary

Snapshots are immutable.

---

# 14. Goals and Milestones

Net Worth Goals represent desired financial outcomes.

Each goal may include:

- Goal ID
- Target amount
- Target date
- Starting Net Worth
- Current Net Worth
- Progress
- Completion status

Milestones represent permanently earned achievements.

Examples:

- Positive Net Worth
- $100,000 Net Worth
- $500,000 Net Worth
- $1,000,000 Net Worth
- Debt Free
- $100,000 Liquid Assets

Completed milestones remain completed even if future Net Worth declines.

---

# 15. Relationship to Investments

Investments remain authoritative for:

- Accounts
- Holdings
- Performance
- Market Value
- Cost Basis
- Allocation

Net Worth consumes only the aggregated account values required for reporting.

The Net Worth domain should never calculate investment performance independently.

---

# 16. Relationship to Retirement

Retirement remains authoritative for:

- Retirement projections
- Retirement readiness
- Withdrawal modeling
- Retirement assumptions

Net Worth includes retirement asset values but does not evaluate retirement preparedness.

---

# 17. Relationship to Goals

Goals may consume Net Worth data when tracking:

- Net Worth targets
- Debt elimination
- Liquid asset growth
- Wealth milestones

The Net Worth domain remains authoritative for financial position.

Goals remain authoritative for lifecycle and completion.

---

# 18. Relationship to the Confidence Engine

The Net Worth domain supplies evidence including:

- Financial resilience
- Liquidity
- Asset growth
- Debt burden
- Long-term preparedness
- Data quality

The Confidence Engine remains responsible for calculating confidence.

Net Worth contributes evidence but never computes confidence independently.

---

# 19. Safety and Validation Rules

The Net Worth model should enforce:

- Owner-scoped access
- Currency consistency
- Deterministic calculations
- Immutable historical snapshots
- Explicit ownership
- Explicit valuation source
- Explicit freshness
- Explicit confidence
- Duplicate detection
- Prevention of double counting
- Valid inclusion state
- Valid liquidity classification

Athena must never:

- Double count assets
- Hide liabilities
- Treat estimates as verified values
- Treat stale data as current
- Modify historical snapshots
- Infer ownership without user confirmation

Unknown values should fail safely.

---

# 20. Future Enhancements

Future Net Worth capabilities may include:

- Multi-currency support
- Automated property valuation providers
- Vehicle valuation providers
- Business valuation
- Asset depreciation modeling
- Estate planning
- Trust ownership
- Historical attribution
- Net Worth forecasting
- Scenario planning
- AI-powered valuation explanations
- Professional advisor reporting
- Household permission management
- Duplicate asset detection
- Portfolio concentration analysis
- Insurance adequacy analysis
- Legacy planning

---

# 21. Revision History

| Version | Date       | Author         | Summary                                                                                                                                                                                                                                                           |
| ------- | ---------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0.0   | 2026-08-03 | Caitlin Gillum | Established the canonical Net Worth domain model defining assets, liabilities, ownership, valuations, liquidity, calculations, historical snapshots, Net Worth goals, milestones, and relationships to Investments, Retirement, Goals, and the Confidence Engine. |
