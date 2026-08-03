# Investments Specification

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
4. Supported Investment Types
5. Accounts and Holdings
6. Portfolio Management
7. Performance Measurement
8. Data Freshness
9. Goal Integration
10. User Experience
11. Portfolio Insights
12. Confidence Engine Integration
13. Safety and Trust
14. Future Enhancements
15. Product Decisions
16. Revision History

---

# 1. Purpose

The Investments system provides a unified view of a user's invested assets, long-term wealth, and portfolio performance.

Rather than functioning as a trading platform, Athena serves as a portfolio intelligence system that helps users understand:

- What they own
- Where it is invested
- How it is performing
- How those investments contribute toward financial goals
- How investments affect overall financial confidence

The Investments page should help users answer:

> "Am I making progress toward long-term financial independence?"

---

# 2. Product Philosophy

Athena does not encourage frequent trading.

Instead, the Investments experience should emphasize:

- Long-term investing
- Diversification
- Financial education
- Goal-based investing
- Progress toward financial independence

The Investments page should reduce anxiety rather than encourage emotional reactions to short-term market movement.

---

# 3. Core Principles

## Truthful

Athena must never fabricate:

- Portfolio values
- Performance
- Market pricing
- Investment returns
- Allocation percentages

All displayed values must originate from verified provider data or user-entered values.

---

## Explainable

Users should understand:

- Why portfolio values changed
- How gains are calculated
- Which accounts contribute to totals
- Which holdings drive performance

---

## Flexible

Athena should support:

- Connected accounts
- Manual investment accounts
- Manual assets
- Hybrid portfolios

---

## Long-Term Focus

Athena should prioritize:

- Years
- Retirement
- Goal progress

rather than encouraging day trading behavior.

---

# 4. Supported Investment Types

Athena should support all major investment asset classes.

## Market Investments

- Stocks
- ETFs
- Mutual Funds
- Index Funds
- Bonds
- Treasury Securities
- REITs

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

## Fixed Income

- Certificates of Deposit (CDs)
- Treasury Bills
- Savings Bonds
- Money Market Funds
- Fixed Annuities

---

## Alternative Investments

Future support may include:

- Cryptocurrency
- Private Equity
- Employee Stock Plans
- RSUs
- Real Estate Investments
- Crowdfunded Investments
- Collectibles
- Other manually valued assets

---

# 5. Accounts and Holdings

Athena distinguishes between investment accounts and investment holdings.

## Investment Account

Examples:

- Fidelity Roth IRA
- Vanguard Brokerage
- Schwab 401(k)

An account represents where investments are held.

---

## Holding

Examples:

- Apple
- FXAIX Mutual Fund
- Treasury Bond ETF
- 12-Month CD

A holding represents the investment itself.

An account may contain many holdings.

---

# 6. Portfolio Management

Users may manage:

- Multiple brokerages
- Retirement accounts
- Employer plans
- CDs
- Mutual funds
- ETFs
- Manual investments

Athena should aggregate all supported investments into a single portfolio view while still allowing drill-down into individual accounts.

---

# 7. Performance Measurement

Performance should be configurable by time period.

Supported ranges:

- Today
- 1 Week
- 1 Month
- 3 Months
- 6 Months
- 1 Year
- Year-to-Date
- All Time
- Custom Range

Changing the selected period should update:

- Portfolio return
- Gain/Loss
- Performance charts
- Best performers
- Worst performers
- Allocation summaries

---

## Contributions vs Performance

Investment returns must remain separate from cash flows.

Deposits and withdrawals must not be counted as investment gains or losses.

Athena should distinguish between:

- Contributions
- Withdrawals
- Investment Growth
- Dividends
- Capital Appreciation

---

# 8. Data Freshness

Athena should always communicate the freshness of investment data.

Possible data states include:

## Real-Time

Used only when supported by the connected provider.

---

## Delayed Market Data

Athena should communicate the provider delay.

Example:

> Market data delayed 15 minutes.

---

## Provider Sync

When real-time data is unavailable, Athena should display:

- Last synced time
- Relative update time

Example:

> Last synced today at 9:42 AM

---

## Manual Valuation

Manually entered assets should clearly display:

- Manual account
- Last updated timestamp

Athena must never imply that manually entered values are live.

---

# 9. Goal Integration

Investments may fund financial goals.

Example:

Goal:

Claire College Fund

Funding Sources:

- 529 Plan
- CD
- Savings Allocation

Goals should understand:

- Current investment value
- Liquidity
- Maturity
- Allocation amount

An investment may contribute toward multiple goals through Athena's allocation model.

---

# 10. User Experience

Users should immediately understand:

- Portfolio value
- Gain/Loss
- Asset Allocation
- Investment Accounts
- Holdings
- Diversification
- Goal Progress
- Data Freshness

The interface should remain calm, readable, and focused on long-term progress.

---

# 11. Portfolio Insights

Future portfolio insights may include:

- Diversification observations
- Concentration risk
- Asset allocation analysis
- Retirement readiness
- Dividend income
- Tax efficiency
- Performance attribution
- Goal funding progress
- Liquidity observations
- Investment education

Insights should explain observations rather than provide financial advice.

---

# 12. Confidence Engine Integration

Investments contribute evidence to several Confidence Engine dimensions.

Examples:

- Long-term preparedness
- Retirement readiness
- Asset diversification
- Financial resilience

Confidence should primarily evaluate:

- Portfolio quality
- Stability
- Goal progress

rather than short-term market performance.

Temporary market volatility should have minimal impact on Confidence.

---

# 13. Safety and Trust

Athena must never:

- Recommend specific securities
- Encourage excessive trading
- Promote market timing
- Present investment advice as certainty
- Fabricate returns
- Hide data freshness

Athena should always communicate:

- Data source
- Data freshness
- Manual vs connected assets
- Investment limitations

---

# 14. Future Enhancements

Future capabilities may include:

- Dividend tracking
- Cost basis analysis
- Tax lot reporting
- Sector allocation
- Geographic diversification
- ESG analysis
- Retirement forecasting
- Monte Carlo simulations
- Portfolio stress testing
- Investment recommendations
- Goal optimization
- AI portfolio insights
- Benchmark comparisons
- Automatic rebalancing suggestions

---

# 15. Product Decisions

## Data Freshness

Athena will display the freshest data supported by each connected provider.

Priority order:

1. Real-time provider data
2. Delayed market data
3. Latest provider synchronization
4. Manual valuation

The interface must always communicate the freshness of displayed values.

---

## Performance Periods

Users may customize investment performance using:

- Today
- 1 Week
- 1 Month
- 3 Months
- 6 Months
- 1 Year
- Year-to-Date
- All Time
- Custom Range

---

## Investment Coverage

Athena supports all investment categories including:

- Brokerage accounts
- Retirement accounts
- CDs
- Mutual funds
- ETFs
- Bonds
- Fixed income
- Alternative assets
- Manual investments

---

## Goal Funding

Investments may be linked as funding sources for financial goals.

Goal progress should reflect allocated investment value rather than assuming the full account balance belongs to a single goal.

---

## Manual Assets

Users may manually track assets not supported by connected providers.

Manual assets must always be clearly identified and include a last updated timestamp.

---

# 16. Revision History

| Version | Date       | Author         | Summary                                                                                                                                                                                                                                                                                             |
| ------- | ---------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0.0   | 2026-08-03 | Caitlin Gillum | Established the Investments product specification defining investment philosophy, supported asset classes, portfolio management, performance measurement, data freshness, goal integration, Confidence Engine relationships, safety principles, future roadmap, and foundational product decisions. |
