# Retirement Model

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
4. Retirement Profile
5. Retirement Accounts
6. Retirement Income Sources
7. Retirement Expenses
8. Contributions
9. Projection Assumptions
10. Retirement Projection
11. Retirement Readiness
12. Scenario Planning
13. Withdrawal Modeling
14. Data Freshness
15. Relationship to Goals
16. Relationship to Investments
17. Relationship to Net Worth
18. Relationship to the Confidence Engine
19. Safety and Validation Rules
20. Future Enhancements
21. Revision History

---

# 1. Purpose

The Retirement domain models the information, assumptions, calculations, and projections required to evaluate long-term retirement readiness.

The model enables Athena to:

- Aggregate retirement accounts and assets
- Track retirement contributions
- Represent expected retirement income
- Estimate retirement expenses
- Calculate long-term retirement projections
- Compare retirement scenarios
- Explain retirement readiness
- Contribute retirement evidence to the Confidence Engine

The Retirement domain is a planning system.

It does not guarantee outcomes or replace professional financial, tax, legal, or investment advice.

---

# 2. Design Philosophy

The Retirement model is built on several principles.

## Explainable

Every projection must be traceable to:

- Current assets
- Contributions
- Income sources
- Expenses
- User assumptions
- System defaults
- Data freshness
- Calculation methods

---

## Flexible

The model should support users with:

- One retirement account
- Multiple employer plans
- Brokerage assets
- Pensions
- Social Security
- Annuities
- Military retirement
- VA benefits
- Rental income
- Manual assets
- Incomplete data

---

## Honest

Retirement projections are estimates.

Athena must never present modeled outcomes as guaranteed.

---

## Long-Term

The model should prioritize long-term preparedness over short-term market movement.

Temporary volatility should not create disproportionate changes in retirement readiness.

---

## User Controlled

Users should be able to review and adjust all material assumptions.

Athena may provide defaults, but defaults must remain visible and editable.

---

# 3. Core Entities

The Retirement domain is expected to include the following core concepts.

## Retirement Profile

Represents the user’s retirement planning assumptions and desired future state.

## Retirement Account

Represents an investment or financial account included in retirement planning.

## Retirement Income Source

Represents expected income available during retirement.

## Retirement Expense Plan

Represents estimated retirement spending.

## Retirement Contribution

Represents money added to retirement accounts.

## Projection Assumption Set

Represents the assumptions used for a retirement calculation.

## Retirement Projection

Represents a deterministic modeled retirement outcome.

## Retirement Scenario

Represents an alternative projection with modified assumptions.

## Withdrawal Strategy

Represents the method used to estimate retirement-account withdrawals.

## Readiness Assessment

Represents an explainable summary of retirement preparedness.

---

# 4. Retirement Profile

Each user may maintain one active retirement profile.

A retirement profile may contain:

- Profile ID
- Owner ID
- Current age
- Desired retirement age
- Optional earliest retirement age
- Optional latest retirement age
- Expected life expectancy
- Desired retirement lifestyle
- Expected retirement location
- Expected household size
- Current annual income
- Estimated retirement expenses
- Estimated healthcare expenses
- Risk tolerance
- Notes
- Created timestamp
- Updated timestamp

The profile should identify whether each value is:

- User provided
- Provider derived
- System estimated
- Defaulted
- Unknown

Retirement age must remain independent from current age so the plan can evolve without rewriting historical projections.

---

# 5. Retirement Accounts

Retirement accounts remain authoritative within the Investments domain but may be referenced by the Retirement domain.

Supported retirement accounts may include:

- 401(k)
- 403(b)
- 457 plan
- Traditional IRA
- Roth IRA
- SEP IRA
- SIMPLE IRA
- TSP
- HSA investment account
- Pension account
- Taxable brokerage account
- Annuity
- Certificate of Deposit
- Treasury securities
- Manually tracked retirement assets

Retirement-specific account metadata may include:

- Account ID
- Tax treatment
- Contribution eligibility
- Contribution limit
- Employer match
- Employer contribution rate
- Vesting status
- Withdrawal restrictions
- Required minimum distribution applicability
- Beneficiary status
- Retirement inclusion status
- Liquidity classification
- Last updated timestamp

The Retirement domain should not duplicate holding-level market data already maintained by Investments.

---

# 6. Retirement Income Sources

Retirement income sources represent expected recurring or one-time income during retirement.

Supported sources may include:

- Social Security
- Pension income
- Military retirement
- VA benefits
- Annuity income
- Retirement-account withdrawals
- Dividends
- Interest
- Rental income
- Business income
- Part-time employment
- Survivor benefits
- User-defined income

Each source may contain:

- Income source ID
- Owner ID
- Name
- Income type
- Expected start age
- Optional end age
- Amount
- Frequency
- Inflation adjustment
- Tax treatment
- Survivor benefit
- Confidence level
- Data source
- Last verified timestamp
- Notes

Income sources should distinguish between:

- Guaranteed
- Estimated
- Variable
- User-entered
- Provider-derived

Athena must not classify uncertain income as guaranteed.

---

# 7. Retirement Expenses

Retirement expenses represent expected spending during retirement.

Expenses may be modeled by category.

Examples include:

- Housing
- Healthcare
- Insurance
- Food
- Transportation
- Travel
- Taxes
- Family support
- Long-term care
- Debt payments
- Discretionary spending
- Custom categories

Each retirement expense may contain:

- Expense ID
- Owner ID
- Category
- Monthly amount
- Annual amount
- Essential or discretionary classification
- Start age
- Optional end age
- Inflation adjustment
- One-time or recurring status
- Phase
- Data source
- Notes

Expense phases may include:

- Early retirement
- Middle retirement
- Late retirement

The model should support current spending as a reference without assuming that current spending remains unchanged.

---

# 8. Contributions

Retirement contributions represent money added to retirement accounts.

Contribution types may include:

- Employee contribution
- Employer match
- Employer profit sharing
- IRA contribution
- HSA contribution
- Catch-up contribution
- Rollover
- Manual contribution
- Taxable investment contribution

Each contribution may contain:

- Contribution ID
- Owner ID
- Source account ID
- Destination account ID
- Contribution type
- Employee amount
- Employer amount
- Total amount
- Contribution date
- Tax year
- Tax treatment
- Recurrence
- Provider transaction reference
- Created timestamp

Contributions must remain separate from investment returns.

A deposit into a retirement account must not increase reported investment performance.

---

# 9. Projection Assumptions

A projection assumption set defines the inputs used for one retirement calculation.

Possible assumptions include:

- Current age
- Retirement age
- Life expectancy
- Annual contribution
- Employer contribution
- Investment-return assumption
- Inflation assumption
- Salary-growth assumption
- Expense-growth assumption
- Healthcare inflation
- Withdrawal-rate assumption
- Tax assumptions
- Social Security assumptions
- Pension assumptions
- Fee assumptions
- Legacy or estate target
- Currency
- Effective date

Each assumption must identify its source:

- User provided
- Provider derived
- System default
- System estimate

Material defaults must be visible to the user.

Projection assumption sets should be immutable after calculation so historical projections remain reproducible.

A revised plan should create a new assumption set rather than silently changing a prior projection.

---

# 10. Retirement Projection

A Retirement Projection represents a deterministic modeled outcome based on one assumption set.

Inputs may include:

- Current retirement assets
- Planned contributions
- Employer contributions
- Expected growth
- Retirement age
- Life expectancy
- Retirement income
- Retirement expenses
- Taxes
- Fees
- Withdrawal strategy

Outputs may include:

- Projected value at retirement
- Inflation-adjusted value
- Estimated annual retirement income
- Estimated monthly retirement income
- Estimated annual expenses
- Funding gap
- Funding surplus
- Projected portfolio longevity
- Required monthly contribution
- Estimated sustainable withdrawal
- Estimated retirement-age range
- Readiness assessment

Each projection may contain:

- Projection ID
- Owner ID
- Assumption set ID
- Baseline or scenario designation
- Calculation date
- Projection horizon
- Nominal outputs
- Inflation-adjusted outputs
- Readiness result
- Explanation summary
- Calculation version

Projection calculations must remain deterministic and reproducible.

---

# 11. Retirement Readiness

Retirement readiness summarizes whether projected resources are likely to support expected retirement needs.

Readiness should not rely on one unexplained percentage.

Possible readiness states include:

- Building Foundation
- Progressing
- On Track
- Strong Position
- Review Needed

A Readiness Assessment may evaluate:

- Projected income coverage
- Funding gap or surplus
- Savings rate
- Contribution consistency
- Employer-match utilization
- Retirement account coverage
- Tax diversification
- Asset diversification
- Debt expected at retirement
- Healthcare preparation
- Withdrawal sustainability
- Data completeness
- Projection uncertainty

Each assessment should contain:

- Readiness state
- Supporting evidence
- Positive factors
- Risk factors
- Missing information
- Recommended next actions
- Confidence level
- Calculation version

Readiness must remain explainable and separate from mission XP, levels, streaks, or cosmetic progress.

---

# 12. Scenario Planning

A Retirement Scenario represents an alternative planning case.

Scenarios may modify:

- Retirement age
- Contribution amount
- Investment-return assumption
- Inflation
- Retirement expenses
- Healthcare costs
- Income sources
- Withdrawal strategy
- Mortgage payoff timing
- Part-time income
- Social Security start age
- Life expectancy

Each scenario may contain:

- Scenario ID
- Owner ID
- Name
- Description
- Baseline projection ID
- Modified assumption set ID
- Projection result
- Created timestamp
- Updated timestamp

Scenarios must not modify:

- Account balances
- Contribution history
- Provider data
- Authoritative financial records

They are planning models only.

---

# 13. Withdrawal Modeling

Withdrawal strategies represent how retirement assets may be converted into income.

Potential strategy types include:

- Fixed percentage
- Fixed dollar amount
- Inflation-adjusted withdrawal
- Guardrail strategy
- Required minimum distributions
- Tax-aware sequencing
- Income-floor strategy
- User-defined strategy

A withdrawal strategy may contain:

- Strategy ID
- Owner ID
- Strategy type
- Starting withdrawal rate
- Annual adjustment rule
- Account sequencing
- Minimum income target
- Maximum withdrawal rule
- Tax assumptions
- Required minimum distribution behavior
- Notes

Withdrawal modeling should consider:

- Taxable accounts
- Tax-deferred accounts
- Tax-free accounts
- Pensions
- Social Security
- Annuities
- Healthcare costs
- Longevity assumptions

Athena must not present one withdrawal method as universally correct.

---

# 14. Data Freshness

Every retirement input should include a freshness classification where applicable.

Supported states include:

## Real-Time

Used only when a provider supplies truly current data.

## Delayed

Used when provider values reflect delayed market data.

## Provider Sync

Used for the latest synchronized value.

## Manual

Used for user-entered information.

## Estimated

Used for system-calculated values.

## Unknown

Used when freshness cannot be determined.

Retirement projections should display the oldest material data timestamp or clearly identify mixed freshness.

Athena must not imply that an entire retirement plan is current when significant inputs are stale or manually estimated.

---

# 15. Relationship to Goals

Retirement is a specialized long-term goal.

The general Goals domain may reference Retirement as a major objective, but the Retirement domain remains authoritative for:

- Retirement assumptions
- Retirement projections
- Retirement income modeling
- Retirement expense modeling
- Withdrawal planning
- Readiness assessments

Retirement assets may participate in the Goal Allocation Model only under approved restrictions.

Goal allocations must not imply that retirement-designated assets are immediately available for unrelated goals.

Liquidity, tax treatment, penalties, and withdrawal restrictions must be considered.

---

# 16. Relationship to Investments

The Investments domain remains authoritative for:

- Investment accounts
- Holdings
- Market values
- Cost basis
- Performance
- Asset allocation
- Data freshness

The Retirement domain consumes selected investment values and metadata.

The Retirement domain should not independently calculate market performance.

Investment performance and retirement readiness remain distinct concepts.

---

# 17. Relationship to Net Worth

Retirement assets contribute to Net Worth.

However, Net Worth represents current financial position, while Retirement represents future funding adequacy.

Not every Net Worth asset should be treated as retirement-available.

Examples include:

- Primary residence
- Restricted assets
- Education funds
- Business assets
- Illiquid property
- Goal-allocated funds
- Assets with significant withdrawal penalties

The Retirement model should explicitly identify which assets are included in retirement projections.

---

# 18. Relationship to the Confidence Engine

Retirement may provide evidence to Confidence Engine dimensions such as:

- Long-Term Preparedness
- Financial Resilience
- Goal Progress
- Future Income Readiness
- Investment Stability

Potential confidence evidence includes:

- Contribution consistency
- Employer-match utilization
- Retirement-account coverage
- Projected funding adequacy
- Tax diversification
- Debt trajectory
- Income-source planning
- Healthcare preparation

Short-term market movement should have limited direct impact.

Confidence calculations must remain separate from retirement-readiness calculations, though the Retirement domain may supply evidence.

---

# 19. Safety and Validation Rules

The Retirement domain should enforce:

- Owner-scoped access
- Valid age ranges
- Retirement age greater than current age unless already retired
- Positive contribution amounts
- Positive expense amounts
- Supported assumption ranges
- Explicit assumption sources
- Immutable historical projection inputs
- Deterministic calculations
- Calculation-version tracking
- Valid account references
- Valid income and expense periods
- Currency consistency
- Data freshness tracking
- No duplicate provider contributions
- No double counting of retirement assets

Athena must never:

- Guarantee a retirement outcome
- Hide material assumptions
- Treat deposits as investment returns
- Present stale data as current
- Present estimates as verified facts
- Count the same asset twice
- Treat all Net Worth as retirement-accessible
- Present tax modeling as professional tax advice
- Present retirement planning as licensed financial advice

Unknown or invalid states must fail safely.

---

# 20. Future Enhancements

Future Retirement capabilities may include:

- Probabilistic projections
- Monte Carlo simulation
- Sequence-of-returns risk
- Social Security benefit estimation
- Pension modeling
- Survivor scenarios
- Spousal and household planning
- Required minimum distribution calculations
- Roth-conversion scenarios
- Federal and state tax modeling
- Healthcare-cost forecasting
- Medicare planning
- Long-term-care planning
- Retirement paycheck generation
- Estate and legacy targets
- Beneficiary review
- Retirement mission plans
- Advisor-ready exports
- AI-assisted explanation
- Stress testing
- Historical scenario comparison
- Professional planning integrations

---

# 21. Revision History

| Version | Date       | Author         | Summary                                                                                                                                                                                                                                                                                                                                                                        |
| ------- | ---------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1.0.0   | 2026-08-03 | Caitlin Gillum | Established the canonical Retirement domain model, defining retirement profiles, accounts, income sources, expenses, contributions, projection assumptions, deterministic projections, readiness assessments, scenarios, withdrawal strategies, data freshness, relationships to Goals, Investments, Net Worth, and the Confidence Engine, safety rules, and future expansion. |
