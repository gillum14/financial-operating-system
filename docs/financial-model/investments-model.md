# Investments Model

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
4. Investment Accounts
5. Holdings
6. Asset Types
7. Portfolio Aggregation
8. Performance Tracking
9. Data Freshness
10. Goal Integration
11. Retirement Accounts
12. Liquidity and Maturity
13. Manual Assets
14. Relationship to Net Worth
15. Relationship to the Confidence Engine
16. Safety and Validation Rules
17. Future Enhancements
18. Revision History

---

# 1. Purpose

The Investments domain models every investment asset owned by a user while separating where an investment is held from what the investment actually is.

The model enables Athena to:

- Aggregate investments across institutions
- Measure long-term portfolio performance
- Connect investments to financial goals
- Contribute investment evidence to Net Worth and the Confidence Engine

Athena is a portfolio management and financial planning platform, not a brokerage or trading application.

---

# 2. Design Philosophy

The Investments model is built upon several principles.

## Truthful

All investment values must originate from:

- Connected financial providers
- Market data providers
- User-entered manual values

Athena must never fabricate portfolio values or investment performance.

---

## Flexible

Users should be able to combine:

- Connected accounts
- Manual accounts
- Manual assets

into one unified portfolio.

---

## Long-Term

The model prioritizes long-term wealth building over short-term market activity.

Performance should emphasize financial progress rather than trading behavior.

---

## Explainable

Every portfolio value should be traceable to:

- An account
- One or more holdings
- A valuation source
- A timestamp

---

# 3. Core Entities

The Investments domain is expected to contain the following primary entities.

## Investment Account

Represents the institution or account where investments are held.

Examples:

- Fidelity Brokerage
- Vanguard IRA
- Schwab Roth IRA
- Employer 401(k)

---

## Holding

Represents an individual investment owned within an account.

Examples:

- Apple
- FXAIX
- VTI
- 12-Month CD
- Treasury Bond

---

## Portfolio

Represents the aggregation of all investment accounts and holdings owned by a user.

---

## Valuation

Represents the value of a holding at a specific point in time.

---

## Market Data

Represents externally supplied pricing information.

---

## Allocation

Represents how investment value contributes toward one or more financial goals.

---

# 4. Investment Accounts

Each investment account should contain:

- Account ID
- Owner ID
- Institution
- Account Name
- Account Type
- Provider
- Connection Status
- Currency
- Total Market Value
- Last Sync Time
- Created Timestamp
- Updated Timestamp

An investment account may contain zero or more holdings.

Investment accounts remain separate from holdings.

---

# 5. Holdings

Each holding represents an individual investment.

A holding may contain:

- Holding ID
- Account ID
- Symbol (optional)
- Security Name
- Asset Type
- Quantity
- Cost Basis
- Average Purchase Price
- Current Market Price
- Current Market Value
- Unrealized Gain/Loss
- Realized Gain/Loss
- Dividend Income
- Currency
- Valuation Source
- Last Updated

A holding belongs to exactly one investment account.

---

# 6. Asset Types

Athena should support a broad range of investment types.

## Equity

- Individual Stocks
- Preferred Shares

---

## Funds

- ETFs
- Mutual Funds
- Index Funds

---

## Fixed Income

- Bonds
- Treasury Securities
- Treasury Bills
- Savings Bonds
- Certificates of Deposit
- Money Market Funds
- Fixed Annuities

---

## Retirement Investments

- 401(k)
- Roth IRA
- Traditional IRA
- SEP IRA
- SIMPLE IRA
- 403(b)
- HSA Investment Accounts
- 529 Plans

---

## Alternative Assets

Future support may include:

- Cryptocurrency
- Private Equity
- Employee Stock Plans
- RSUs
- Crowdfunded Investments
- Collectibles
- Other manually valued assets

---

# 7. Portfolio Aggregation

A user's portfolio represents the sum of all supported investment accounts.

Portfolio totals should aggregate:

- Total Market Value
- Total Cost Basis
- Total Gain/Loss
- Dividend Income
- Asset Allocation
- Account Allocation

Portfolio calculations should remain deterministic and reproducible.

---

# 8. Performance Tracking

Performance should support configurable time ranges.

Supported periods include:

- Today
- One Week
- One Month
- Three Months
- Six Months
- One Year
- Year-to-Date
- All Time
- Custom Range

Performance calculations should distinguish between:

- Contributions
- Withdrawals
- Investment Returns
- Dividends
- Capital Appreciation

Cash contributions must never be interpreted as investment growth.

---

# 9. Data Freshness

Each investment value should include a freshness classification.

## Real-Time

Provider supplies live pricing.

---

## Delayed

Provider supplies delayed market pricing.

The delay should be displayed to the user.

---

## Provider Sync

Latest synchronized account values.

The interface should display:

- Last Sync Timestamp
- Relative Update Time

---

## Manual

User-entered valuation.

Manual assets must always display:

- Manual Value
- Last Updated Timestamp

Athena must never imply manual values are current market prices.

---

# 10. Goal Integration

Investment assets may contribute toward financial goals.

Examples:

Goal:

Claire College Fund

Funding Sources:

- Fidelity 529
- 12-Month CD
- Savings Allocation

The allocation model remains independent from account balances.

An investment may support:

- One goal
- Multiple goals
- No goals

Goal allocations represent financial intent, not legal ownership.

---

# 11. Retirement Accounts

Retirement accounts should be modeled as investment accounts with additional characteristics.

Possible attributes include:

- Tax Treatment
- Contribution Limits
- Employer Match
- Withdrawal Restrictions
- Required Minimum Distributions
- Beneficiary Information

Retirement-specific calculations should remain independent from ordinary brokerage accounts.

---

# 12. Liquidity and Maturity

Certain investments require additional metadata.

Examples include:

## Liquidity

Examples:

- Immediate
- Short-Term
- Restricted
- Illiquid

---

## Maturity

Applicable to:

- CDs
- Bonds
- Treasury Securities
- Fixed Annuities

Metadata may include:

- Maturity Date
- Interest Rate
- Early Withdrawal Penalty
- Redemption Rules

Goals and future forecasting should consider liquidity before recommending allocations.

---

# 13. Manual Assets

Users may manually create investment accounts or holdings.

Manual assets should support:

- Name
- Asset Type
- Current Value
- Purchase Price
- Purchase Date
- Notes
- Last Updated Timestamp

Manual assets should be visually distinguished from provider-connected investments.

---

# 14. Relationship to Net Worth

Investments contribute directly to Net Worth.

Net Worth should aggregate:

- Cash
- Investments
- Retirement Accounts
- Other Assets

while subtracting liabilities.

Investment values should update Net Worth automatically whenever portfolio values change.

---

# 15. Relationship to the Confidence Engine

Investments provide evidence to several Confidence dimensions.

Examples include:

- Long-Term Preparedness
- Retirement Readiness
- Diversification
- Financial Resilience

Confidence calculations should prioritize:

- Portfolio stability
- Diversification
- Goal funding
- Long-term consistency

Temporary market volatility should contribute very little to overall confidence.

The Confidence Engine evaluates financial readiness rather than investment performance.

---

# 16. Safety and Validation Rules

The Investments domain should enforce:

- Owner-scoped investment access
- Valid account-to-holding relationships
- Supported asset classifications
- Deterministic portfolio calculations
- Accurate performance calculations
- Explicit valuation sources
- Data freshness tracking
- Goal allocation consistency
- Currency consistency
- Idempotent synchronization

Athena must never:

- Present stale values as live
- Treat deposits as investment gains
- Recommend speculative investments
- Hide valuation sources
- Hide data freshness

---

# 17. Future Enhancements

Future capabilities may include:

- Dividend forecasting
- Cost basis optimization
- Tax-loss harvesting insights
- Benchmark comparisons
- Sector allocation analysis
- Geographic diversification
- ESG reporting
- Monte Carlo retirement simulations
- Retirement income forecasting
- Portfolio stress testing
- AI investment insights
- Rebalancing recommendations
- Alternative asset valuation
- Institutional portfolio analytics

---

# 18. Revision History

| Version | Date       | Author         | Summary                                                                                                                                                                                                                                                                                                                                                 |
| ------- | ---------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0.0   | 2026-08-03 | Caitlin Gillum | Established the canonical Investments domain model, defining investment accounts, holdings, asset classifications, portfolio aggregation, performance tracking, data freshness, goal allocations, retirement modeling, liquidity and maturity concepts, Net Worth integration, Confidence Engine relationships, validation rules, and future expansion. |
