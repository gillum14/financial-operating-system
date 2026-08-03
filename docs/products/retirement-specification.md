# Retirement Specification

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
4. Relationship to Goals
5. Retirement Profile
6. Retirement Accounts and Assets
7. Retirement Income Sources
8. Retirement Expenses
9. Contributions
10. Retirement Readiness
11. Projection Model
12. Scenario Planning
13. Withdrawal Planning
14. Data Freshness
15. User Experience
16. Relationship to Investments
17. Relationship to Net Worth
18. Relationship to the Confidence Engine
19. Safety and Trust
20. Future Enhancements
21. Open Questions
22. Revision History

---

# 1. Purpose

The Retirement system helps users understand whether their current financial behavior is likely to support their desired future lifestyle.

It should help users answer:

> Am I on track for the retirement I want?

The Retirement experience should combine:

- Retirement accounts
- Investment balances
- Contribution behavior
- Expected income sources
- Estimated expenses
- Retirement timing
- Long-term projections
- Scenario planning

Athena should present retirement planning as an understandable, adjustable process rather than a single intimidating number.

---

# 2. Product Philosophy

Retirement planning should feel:

- Understandable
- Calm
- Personalized
- Long-term
- Flexible
- Honest
- Actionable

Athena should not shame users for starting late, saving less than recommended, or having uncertain retirement plans.

The system should focus on:

- Current position
- Future direction
- Practical next actions
- Transparent assumptions
- Meaningful progress

Athena should help users improve their retirement readiness without presenting uncertain projections as guaranteed outcomes.

---

# 3. Core Principles

## Retirement Is a Journey

Retirement readiness develops over time.

Athena should recognize incremental progress rather than treating retirement as pass or fail.

---

## Projections Are Estimates

Retirement projections depend on assumptions such as:

- Investment growth
- Inflation
- Contributions
- Retirement age
- Life expectancy
- Income
- Expenses
- Withdrawal rates
- Taxes

Athena must clearly communicate that projections are estimates, not promises.

---

## Assumptions Must Be Visible

Users should be able to understand and adjust the assumptions affecting their retirement outlook.

Athena must never hide material assumptions behind a single score or projected value.

---

## Financial Evidence Comes First

Retirement calculations should use real account, investment, contribution, and income data whenever available.

When data is missing, Athena should clearly identify:

- What is unknown
- Which default assumption is being used
- How the uncertainty affects the result

---

## Long-Term Stability Over Short-Term Volatility

Temporary market movement should not create dramatic changes in retirement guidance unless the change materially affects long-term readiness.

---

# 4. Relationship to Goals

Retirement is a specialized long-term financial goal.

It shares foundational concepts with Athena's Goals system, including:

- Target outcomes
- Funding sources
- Progress
- Contributions
- Milestones
- Forecasting

However, Retirement requires a dedicated workspace because it includes:

- Multiple retirement accounts
- Long-term market projections
- Inflation assumptions
- Retirement income sources
- Withdrawal modeling
- Life-expectancy assumptions
- Tax considerations
- Healthcare planning
- Scenario comparison

The general Goals system may show retirement as a major goal, but the Retirement system remains authoritative for retirement-specific calculations and projections.

Retirement progress must not be calculated as a simple percentage of one target amount unless the underlying assumptions support that representation.

---

# 5. Retirement Profile

Each user may define a retirement profile containing:

- Current age
- Desired retirement age
- Optional minimum retirement age
- Optional maximum retirement age
- Desired retirement lifestyle
- Expected retirement location
- Expected household size
- Estimated life expectancy
- Current annual income
- Expected retirement expenses
- Expected healthcare costs
- Risk tolerance
- Inflation assumption
- Investment-return assumption
- Withdrawal-rate assumption
- Tax assumptions
- Notes

Users should be able to update these assumptions as their circumstances change.

Athena should distinguish between:

- User-provided assumptions
- Provider-derived data
- System defaults
- Estimated values

---

# 6. Retirement Accounts and Assets

The Retirement system should support all relevant retirement and long-term investment accounts.

Examples include:

- 401(k)
- 403(b)
- Traditional IRA
- Roth IRA
- SEP IRA
- SIMPLE IRA
- TSP
- Pension accounts
- HSA investment accounts
- 457 plans
- 529 assets when relevant to broader planning
- Taxable brokerage accounts
- Annuities
- Certificates of Deposit
- Treasury securities
- Other manually tracked assets

Athena should identify:

- Account type
- Current value
- Tax treatment
- Contribution history
- Employer contributions
- Vesting status
- Withdrawal restrictions
- Required minimum distribution rules
- Beneficiary information where supported
- Data source
- Last updated timestamp

Retirement accounts remain part of the Investments domain while contributing to the Retirement projection model.

---

# 7. Retirement Income Sources

Athena should support expected retirement income from multiple sources.

Examples include:

- Social Security
- Pension income
- Annuity income
- Retirement-account withdrawals
- Dividends
- Interest
- Rental income
- Business income
- Part-time work
- Military retirement
- VA benefits
- Other recurring income
- User-defined income sources

Each income source may include:

- Expected start age
- Estimated amount
- Frequency
- Inflation adjustment
- Tax treatment
- Survivor benefit
- Confidence level
- Data source
- Notes

Athena must not assume an income source is guaranteed unless the user or provider has confirmed it.

---

# 8. Retirement Expenses

Users should be able to estimate retirement expenses using:

- Current expenses
- Expected lifestyle changes
- Housing
- Healthcare
- Insurance
- Transportation
- Travel
- Food
- Taxes
- Family support
- Long-term care
- Debt payments
- Discretionary spending
- Custom categories

Athena may begin with current spending as a planning reference but must not assume current expenses will remain unchanged.

Retirement expenses should support:

- Monthly and annual views
- Inflation adjustments
- One-time expenses
- Phase-based expenses
- Essential and discretionary classification

Future projections may distinguish between:

- Early retirement
- Middle retirement
- Late retirement

---

# 9. Contributions

Retirement contributions may include:

- Employee contributions
- Employer match
- Employer profit sharing
- Automatic deposits
- Manual contributions
- Catch-up contributions
- IRA contributions
- HSA contributions
- Rollover activity
- Taxable investment contributions

Athena should track:

- Contribution amount
- Contribution date
- Source account
- Destination account
- Contribution type
- Employer portion
- Employee portion
- Tax treatment
- Recurrence
- Annual limit impact

Contributions must remain separate from investment performance.

A deposit into a retirement account is not an investment gain.

---

# 10. Retirement Readiness

Retirement readiness should summarize the user's long-term position without reducing the entire experience to one unexplained number.

Potential readiness signals include:

- Projected retirement funding
- Expected retirement income
- Estimated retirement expenses
- Savings rate
- Contribution consistency
- Employer-match utilization
- Account diversification
- Tax diversification
- Time remaining
- Withdrawal sustainability
- Emergency preparedness
- Debt expected at retirement
- Healthcare preparedness

Athena may classify readiness using supportive language such as:

- Building Foundation
- Progressing
- On Track
- Strong Position
- Review Needed

Readiness labels must remain explainable.

Athena should show:

- Why the status was assigned
- Which assumptions drive it
- What has improved
- What is creating risk
- Which actions may help

---

# 11. Projection Model

The Retirement projection model should estimate future outcomes using deterministic calculations.

Inputs may include:

- Current retirement assets
- Planned contributions
- Employer contributions
- Estimated investment growth
- Inflation
- Retirement age
- Retirement expenses
- Retirement income sources
- Taxes
- Withdrawal assumptions
- Life expectancy
- Fees
- Required minimum distributions

Outputs may include:

- Projected portfolio value at retirement
- Estimated monthly retirement income
- Estimated annual retirement income
- Projected expenses
- Funding gap or surplus
- Estimated portfolio longevity
- Required monthly contribution
- Possible retirement-age range
- Readiness status

Athena must distinguish between:

- Nominal values
- Inflation-adjusted values
- Before-tax income
- After-tax income

The projection model should preserve historical assumptions so users can understand why projections changed over time.

---

# 12. Scenario Planning

Users should be able to compare retirement scenarios.

Examples include:

- Retire at 60, 65, or 67
- Increase monthly contributions
- Reduce expected retirement expenses
- Include or exclude Social Security
- Change investment-return assumptions
- Pay off a mortgage before retirement
- Add part-time income
- Delay retirement
- Model a career break
- Model a lower-return environment
- Model higher healthcare expenses

Each scenario should clearly show:

- Assumptions changed
- Projected impact
- Differences from the baseline
- Major risks
- Degree of uncertainty

Scenarios must not alter authoritative account data.

They are planning models only.

---

# 13. Withdrawal Planning

Future retirement planning should support withdrawal modeling.

Potential strategies include:

- Fixed percentage
- Fixed dollar amount
- Inflation-adjusted withdrawals
- Guardrail strategy
- Required minimum distributions
- Tax-aware account sequencing
- Income-floor planning
- User-defined strategy

Withdrawal projections should consider:

- Taxable accounts
- Tax-deferred accounts
- Tax-free accounts
- Pensions
- Social Security
- Annuities
- Required minimum distributions
- Healthcare costs
- Longevity assumptions

Athena should not present one withdrawal strategy as universally correct.

---

# 14. Data Freshness

Retirement data should display its source and freshness.

Possible classifications include:

## Real-Time

Used only when a connected provider supplies truly current data.

## Delayed Market Data

The known delay should be disclosed.

## Provider Sync

The latest synchronization timestamp should be shown.

## Manual

User-entered data should display:

- Manual status
- Last updated timestamp

## Estimated

System-derived estimates should clearly display:

- Estimated status
- Assumptions used

The Retirement page must not imply that all information is equally current when different accounts and assumptions have different freshness levels.

---

# 15. User Experience

Users should immediately understand:

- Current retirement savings
- Desired retirement age
- Projected retirement position
- Estimated monthly retirement income
- Expected retirement expenses
- Funding gap or surplus
- Contribution progress
- Account distribution
- Important assumptions
- Data freshness
- Next recommended action

The experience should provide both:

- A high-level summary
- Detailed explainability

The page should remain useful even when the user has incomplete data.

Incomplete states should guide users toward adding:

- Retirement accounts
- Income sources
- Retirement age
- Expense estimates
- Contribution plans

Athena must not fabricate readiness or projections when required inputs are missing.

---

# 16. Relationship to Investments

The Investments system remains authoritative for:

- Investment accounts
- Holdings
- Market values
- Cost basis
- Performance
- Data freshness
- Asset allocation

The Retirement system consumes relevant investment data for long-term planning.

Investment performance and retirement readiness remain distinct.

A portfolio may perform strongly in a short period while the user remains underfunded for retirement.

A portfolio may decline temporarily while the user remains on track over the long term.

---

# 17. Relationship to Net Worth

Retirement assets contribute to Net Worth.

However, Net Worth and Retirement Readiness answer different questions.

Net Worth asks:

> What is the user's current financial position?

Retirement asks:

> Is the user's current and expected future position likely to support retirement?

Athena should not assume that all net worth is available for retirement.

Examples include:

- Primary residence
- Restricted assets
- College funds
- Business assets
- Illiquid property
- Goal-allocated funds

---

# 18. Relationship to the Confidence Engine

Retirement may contribute evidence to Confidence Engine dimensions such as:

- Long-Term Preparedness
- Financial Resilience
- Goal Progress
- Investment Stability
- Future Income Readiness

Confidence should consider:

- Contribution consistency
- Retirement-account coverage
- Estimated funding adequacy
- Employer-match utilization
- Debt trajectory
- Diversification
- Retirement-income planning

Short-term market volatility should have limited influence on confidence.

Retirement confidence must be based on explainable financial evidence rather than page usage, mission XP, or cosmetic progress.

---

# 19. Safety and Trust

Athena must never:

- Guarantee retirement outcomes
- Present projections as certainty
- Hide assumptions
- Fabricate retirement income
- Treat market growth as guaranteed
- Recommend specific securities as required solutions
- Present tax estimates as professional tax advice
- Present retirement guidance as licensed financial advice
- Encourage harmful financial sacrifices
- Ignore essential current needs in favor of retirement contributions

Athena should clearly communicate:

- Projection uncertainty
- Data freshness
- Missing data
- Assumptions
- Limitations
- Material risks

Users must remain in control of all retirement assumptions and planning decisions.

---

# 20. Future Enhancements

Future Retirement capabilities may include:

- Social Security estimation
- Pension modeling
- Retirement-income sequencing
- Tax-aware withdrawals
- Required minimum distribution planning
- Roth-conversion scenarios
- Healthcare-cost forecasting
- Medicare planning
- Long-term-care planning
- Spousal retirement planning
- Household retirement projections
- Survivor scenarios
- Monte Carlo simulations
- Market stress testing
- Sequence-of-returns risk
- Retirement paycheck planning
- Estate-planning coordination
- Beneficiary review
- Retirement mission plans
- AI-assisted retirement explanations
- Professional-advisor export packages

---

# 21. Open Questions

## Readiness Score

Should Retirement use a distinct readiness score, a readiness status, or both?

## Baseline Assumptions

Which return, inflation, life-expectancy, and withdrawal assumptions should Athena provide by default?

## Social Security

Should Athena calculate estimated Social Security benefits or require users to enter official estimates?

## Pension Modeling

How should Athena represent pensions with survivor benefits, cost-of-living adjustments, and uncertain future eligibility?

## Household Planning

Should household retirement planning aggregate all shared assets and income or preserve separate individual plans with a combined view?

## Retirement Target

Should Athena use one target portfolio number, an income-replacement target, or multiple planning methods?

## Market Modeling

Should Version 1 use deterministic average returns before introducing probabilistic simulations?

## Healthcare Costs

How detailed should healthcare and long-term-care estimates be in the first backend version?

## Tax Modeling

What level of federal and state tax estimation is appropriate without presenting tax advice?

## Goal Allocation

Can a retirement account be partially allocated to other long-term goals, or should retirement-designated assets remain protected from general goal allocations?

---

# 22. Revision History

| Version | Date       | Author         | Summary                                                                                                                                                                                                                                                                                                                                                                     |
| ------- | ---------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0.0   | 2026-08-03 | Caitlin Gillum | Established the Retirement product specification, defining retirement philosophy, retirement profiles, accounts, income sources, expenses, contributions, readiness, projection modeling, scenarios, withdrawals, data freshness, relationships to Goals, Investments, Net Worth, and the Confidence Engine, safety principles, future roadmap, and open product decisions. |
