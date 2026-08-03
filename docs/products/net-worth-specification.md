# Net Worth Specification

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
4. Included Assets and Liabilities
5. Manual Valuations
6. Real Estate and Secured Debt
7. Ownership and Household Views
8. Inclusion and Exclusion Rules
9. Net Worth Calculations
10. Liquid Net Worth
11. Retirement Assets
12. Data Refresh and Freshness
13. Valuation Confidence
14. Historical Snapshots
15. Net Worth Goals and Milestones
16. Relationship to Goals
17. Relationship to Investments
18. Relationship to Retirement
19. Relationship to the Confidence Engine
20. User Experience
21. Safety and Trust
22. Future Enhancements
23. Product Decisions
24. Revision History

---

# 1. Purpose

The Net Worth system provides a unified view of a user's current financial position by aggregating included assets and subtracting included liabilities.

It should help users answer:

> What do I own, what do I owe, and how is my overall financial position changing over time?

The Net Worth experience should provide:

- Current total Net Worth
- Asset totals
- Liability totals
- Liquid Net Worth
- Retirement assets
- Real estate equity
- Historical trends
- Ownership views
- Valuation freshness
- Valuation confidence
- Net Worth goals and milestones

Athena should present Net Worth as an understandable financial signal rather than a status symbol.

---

# 2. Product Philosophy

Net Worth is a measure of financial position.

It is not a measure of personal worth.

Athena should help users understand:

- The structure of their assets
- The burden of their liabilities
- The accessibility of their wealth
- The reliability of their valuations
- The direction of their financial progress

The experience should feel:

- Calm
- Honest
- Clear
- Comprehensive
- Explainable
- Flexible
- Supportive

Athena must not shame users for negative Net Worth, limited assets, or high liabilities.

The product should emphasize progress, structure, and practical next actions.

---

# 3. Core Principles

## Comprehensive

Athena should support all reasonable assets and liabilities that materially affect a user's financial position.

---

## User Controlled

Users decide which eligible assets and liabilities are included in Net Worth.

Tracking an item elsewhere in Athena does not require including it in Net Worth.

---

## Explainable

Every Net Worth total should be traceable to:

- Included assets
- Included liabilities
- Valuation sources
- Ownership scope
- Freshness timestamps
- Calculation version

---

## Current and Historical

Athena should distinguish between:

- Current Net Worth calculated from the latest available values
- Historical Net Worth preserved through stored snapshots

---

## Structured, Not Simplistic

Total Net Worth alone does not explain financial resilience.

Athena should also distinguish:

- Liquid assets
- Retirement assets
- Real estate equity
- Restricted assets
- Short-term liabilities
- Long-term liabilities

---

## Truthful

Athena must never fabricate:

- Asset values
- Liability balances
- Property values
- Ownership percentages
- Historical values
- Data freshness
- Valuation confidence
- Net Worth growth
- Goal progress

---

# 4. Included Assets and Liabilities

Athena should support all reasonable user-approved assets and liabilities.

## Assets

Supported asset categories may include:

- Checking accounts
- Savings accounts
- Money market accounts
- Cash
- Certificates of Deposit
- Brokerage accounts
- Stocks
- ETFs
- Mutual funds
- Bonds
- Treasury securities
- Retirement accounts
- Annuities
- Real estate
- Business ownership
- Vehicles
- Valuable personal property
- Collectibles
- Cryptocurrency
- Employee equity
- Other manually valued assets

## Liabilities

Supported liability categories may include:

- Mortgages
- Home-equity loans
- Home-equity lines of credit
- Auto loans
- Credit cards
- Personal loans
- Student loans
- Medical debt
- Tax liabilities
- Business debt
- Secured loans
- Other user-defined liabilities

Athena should not force every tracked item into Net Worth.

Each item must have an explicit inclusion state.

---

# 5. Manual Valuations

Users may manually create and value assets or liabilities that are not available through connected providers.

A manual item may include:

- Name
- Item type
- Current value or balance
- Ownership
- Valuation method
- Valuation date
- Optional purchase price
- Optional acquisition date
- Optional notes
- Included in Net Worth status
- Last updated timestamp

Manual items must be clearly labeled.

Athena must not imply that a manually entered value is:

- Verified
- Provider connected
- Real time
- Automatically refreshed

Users should be able to update manual values at any time.

---

# 6. Real Estate and Secured Debt

Real estate should be included when the user identifies as a property owner and adds the property to Athena.

A primary residence should be included by default once it is created, while preserving the user's ability to exclude it.

## Property Equity

Property equity should be calculated as:

```text
Current property value
− mortgage balance
− home-equity loan balance
− HELOC balance
− other secured debt
= estimated property equity
```

Athena should allow the user to select or enter the valuation source.

Possible valuation sources include:

- Formal appraisal
- User-entered value
- Purchase price
- Provider estimate
- Automated valuation model
- Other documented source

Athena must distinguish an automated estimate from a formal appraisal.

Each property value should display:

- Valuation source
- Valuation date
- Freshness
- Valuation confidence
- User override status

Secured debt should remain a separate liability while also being visibly associated with the applicable asset.

---

# 7. Ownership and Household Views

Athena should support multiple ownership scopes.

## Ownership Classifications

An asset or liability may be classified as:

- Individual
- Joint
- Household
- Shared by defined percentage

Future versions may support more detailed ownership percentages.

## Views

Users should be able to view:

- My Net Worth
- Household Net Worth
- Permitted household-member view

Household Net Worth should combine all permitted individual, joint, and household items.

Athena must not expose private financial details that a household member has not agreed to share.

A household total may include a permitted value without exposing detailed account or transaction data where privacy settings require that distinction.

---

# 8. Inclusion and Exclusion Rules

Every eligible asset, liability, and account should provide an:

```text
Include in Net Worth
On / Off
```

control.

Exclusion should:

- Remove the item from Net Worth calculations
- Preserve the underlying record
- Preserve the item's use elsewhere in Athena
- Preserve historical auditability
- Avoid deleting or archiving the item

Athena should show excluded totals or an excluded-item summary so users can understand differences between tracked values and calculated Net Worth.

Items may be excluded for reasons such as:

- Personal preference
- Uncertain valuation
- Temporary ownership
- Legal restrictions
- Separate household planning
- Duplicate representation
- Non-financial relevance

---

# 9. Net Worth Calculations

## Total Net Worth

Total Net Worth should be calculated as:

```text
Sum of included asset values
− sum of included liability balances
= total Net Worth
```

## Asset Total

```text
Sum of all included asset values
```

## Liability Total

```text
Sum of all included liability balances
```

## Real Estate Equity

```text
Included property values
− included secured debts
```

Calculations must remain:

- Deterministic
- Reproducible
- Owner scoped
- Ownership aware
- Currency consistent
- Versioned where necessary

Athena must prevent double counting.

Examples of potential double counting include:

- Counting an investment account total and each holding separately
- Counting property equity and the full property value without subtracting secured debt
- Counting the same jointly owned asset in multiple household totals
- Counting a manual asset and a connected provider representation of the same item

---

# 10. Liquid Net Worth

Athena should display Liquid Net Worth as a secondary metric.

Liquid Net Worth should represent assets that are immediately or reasonably accessible, less applicable short-term liabilities.

Potentially liquid assets include:

- Cash
- Checking
- Savings
- Money market accounts
- Short-term CDs
- Readily sellable taxable investments

Items that may be excluded or classified separately include:

- Retirement accounts
- Primary residence
- Illiquid real estate
- Business ownership
- Restricted investments
- Collectibles
- Assets with significant penalties or delays

Liquid Net Worth should not replace Total Net Worth.

It should help users understand how much of their wealth is actually accessible.

The exact liquidity classification rules should remain explicit and configurable by asset type.

---

# 11. Retirement Assets

Retirement assets should be included in Total Net Worth.

They should also be displayed as a separate category because they are:

- Long term
- Restricted
- Tax sensitive
- Potentially subject to withdrawal penalties
- Not equivalent to emergency liquidity

Recommended high-level presentation:

```text
Total Net Worth

Liquid / Accessible Assets

Retirement Assets

Real Estate Equity

Other Assets

Total Liabilities
```

Retirement assets should contribute to long-term preparedness and retirement readiness.

They must not be treated as immediately available cash.

---

# 12. Data Refresh and Freshness

Net Worth values should use the freshest supported data source.

Refresh cadence should vary by asset type.

## Connected Financial Accounts

Refresh when the provider synchronizes.

## Market-Traded Investments

Use:

1. Real-time pricing when truly supported
2. Delayed market data when disclosed
3. Latest provider synchronization
4. Manual valuation as fallback

## Real Estate

Automated estimates may refresh approximately monthly or when a provider supplies a materially newer value.

Users should also be able to request or enter an update.

## Vehicles

Vehicle estimates may refresh monthly or quarterly depending on provider capabilities.

## Manual Assets

Manual values should not change automatically.

Athena may prompt users to review them:

- Every 90 days by default
- Earlier for volatile assets
- On a user-defined schedule

## Current Net Worth

Current Net Worth should be recalculated from the latest available included values whenever the page is loaded or relevant data changes.

---

# 13. Valuation Confidence

Freshness and valuation confidence must remain separate concepts.

## Freshness

Freshness describes how recent a value is.

Possible states include:

- Current
- Recently updated
- Stale
- Very stale
- Unknown

Freshness thresholds should vary by asset type.

A two-day-old checking balance may be stale, while a six-month-old formal appraisal may remain reasonable.

## Valuation Confidence

Valuation confidence describes how reliable or precise the value is.

Possible classifications include:

- Verified
- Estimated
- Manual
- Unknown

### Verified

Examples:

- Connected bank balance
- Brokerage market value
- Formal appraisal
- Confirmed liability balance

### Estimated

Examples:

- Automated property estimate
- Vehicle valuation model
- Estimated business value
- Modeled personal-property value

### Manual

User-entered value without external verification.

### Unknown

The source or reliability cannot be established.

Each included item should display:

- Valuation classification
- Source
- Last updated timestamp
- Relevant estimate or verification context

Athena may provide a portfolio-level data-quality summary when it can be calculated truthfully.

Example:

```text
Net Worth data quality: Strong

92% of included value is current or verified.
```

This summary must be derived from real source and freshness data.

---

# 14. Historical Snapshots

Athena should use a hybrid snapshot model.

## Current Net Worth

Current Net Worth is calculated dynamically from the latest available values.

## Scheduled Snapshots

Athena should create one official historical snapshot at the end of each calendar month.

Monthly snapshots support:

- Consistent historical comparisons
- Budget and reporting alignment
- Reduced market noise
- Clear long-term trends
- Manageable storage

## Material-Event Snapshots

Athena may also create a snapshot when:

- The user requests one
- A major asset is added or removed
- A major liability is paid off
- A property valuation changes materially
- A household ownership configuration changes
- A significant inheritance or windfall is recorded
- A business or real estate asset is acquired or sold

Each snapshot should preserve:

- Snapshot date
- Ownership scope
- Included assets
- Included liabilities
- Item values
- Valuation sources
- Freshness timestamps
- Inclusion states
- Category totals
- Total Net Worth
- Liquid Net Worth where supported
- Calculation version

Historical snapshots must remain immutable after creation except through an explicit correction workflow.

Historical Net Worth should not be recalculated using current values.

---

# 15. Net Worth Goals and Milestones

Athena should support Net Worth goals.

A Net Worth goal may include:

- Target amount
- Target date
- Current progress
- Starting value
- Milestones
- Required monthly change
- Historical trend
- Related missions
- Completion date

Examples include:

- Reach positive Net Worth
- Reach $100,000 in Net Worth
- Eliminate consumer debt
- Build $50,000 in liquid assets
- Reach $1 million in retirement assets
- Reach a defined household Net Worth

Milestones should remain permanently completed once achieved.

If market movement later reduces Net Worth, Athena may show the current change but should not erase the historical accomplishment.

Net Worth goal progress must be calculated from stored and current Net Worth data rather than fabricated estimates.

---

# 16. Relationship to Goals

The Goals system may reference Net Worth outcomes and milestones.

Examples include:

- Reach positive Net Worth
- Build a defined liquid Net Worth
- Reach a retirement-asset threshold
- Eliminate a liability category

The Net Worth system remains authoritative for:

- Included-value calculations
- Historical snapshots
- Ownership scope
- Net Worth totals
- Asset and liability aggregation

The Goals system remains authoritative for:

- Target intent
- Goal lifecycle
- Milestones
- Contributions or allocations where applicable
- Goal-related missions

Net Worth goals should not require allocating every asset to the goal.

They measure aggregate financial position.

---

# 17. Relationship to Investments

The Investments domain remains authoritative for:

- Investment accounts
- Holdings
- Market values
- Cost basis
- Performance
- Asset allocation
- Data freshness

The Net Worth system consumes the appropriate investment-account value.

It must avoid double counting holdings and account totals.

Investment gains and losses affect Current Net Worth when values update.

Historical Net Worth changes should reflect stored snapshot values, not retroactively recalculated market prices.

---

# 18. Relationship to Retirement

Retirement assets are included in Total Net Worth but remain separately classified.

The Retirement domain remains authoritative for:

- Retirement assumptions
- Retirement readiness
- Retirement projections
- Income modeling
- Expense modeling
- Withdrawal planning

The Net Worth system should not treat all retirement assets as liquid or immediately accessible.

Net Worth and Retirement answer different questions.

Net Worth asks:

> What is the user's current financial position?

Retirement asks:

> Is the user's long-term plan likely to support retirement?

---

# 19. Relationship to the Confidence Engine

Net Worth should contribute evidence to the existing Confidence Engine.

Potential evidence includes:

- Financial resilience
- Liquidity
- Debt position
- Asset growth
- Long-term preparedness
- Retirement readiness
- Goal progress
- Data quality
- Ownership clarity

A high Total Net Worth must not automatically produce a high Confidence Score.

Examples of potentially weak financial structure include:

- High home equity with little accessible cash
- Significant retirement assets with high short-term debt
- Large manually valued assets with weak confidence
- High Net Worth concentrated in illiquid assets
- Positive Net Worth with unstable cash flow

The Confidence Engine should evaluate:

- Structure
- Accessibility
- Reliability
- Debt burden
- Progress
- Preparedness

Net Worth provides evidence.

The Confidence Engine remains authoritative for confidence calculations.

The existing Confidence Engine specification and calculation framework should be referenced rather than duplicated.

---

# 20. User Experience

Users should immediately understand:

- Total Net Worth
- Total assets
- Total liabilities
- Liquid Net Worth
- Retirement assets
- Real estate equity
- Current ownership view
- Historical change
- Data freshness
- Valuation confidence
- Included and excluded items
- Goal progress
- Important next actions

The page should support:

- Individual view
- Household view
- Asset and liability drill-down
- Inclusion toggles
- Valuation updates
- Snapshot history
- Goal and milestone tracking
- Manual item management

The experience should remain useful even when data is incomplete.

Incomplete states should guide the user toward:

- Adding accounts
- Adding liabilities
- Adding real estate
- Reviewing manual values
- Resolving stale valuations
- Confirming ownership
- Creating a Net Worth goal

Athena must not fabricate a complete Net Worth picture when material data is missing.

---

# 21. Safety and Trust

Athena must never:

- Present Net Worth as personal worth
- Hide excluded items from explanation
- Present stale values as current
- Present estimates as verified facts
- Double count assets
- Omit liabilities without disclosure
- Treat all assets as liquid
- Treat automated estimates as formal appraisals
- Expose private household financial details without permission
- Fabricate historical values
- Guarantee future Net Worth growth
- Provide professional appraisal, tax, legal, or investment advice

Athena should clearly communicate:

- Valuation source
- Freshness
- Ownership scope
- Inclusion status
- Estimate limitations
- Missing data
- Calculation assumptions
- Historical snapshot rules

Users must remain in control of inclusion, valuation, and household sharing decisions.

---

# 22. Future Enhancements

Future Net Worth capabilities may include:

- Automated property valuation integrations
- Vehicle valuation integrations
- Business valuation support
- Ownership-percentage calculations
- More advanced household permissions
- Trust and estate ownership
- International assets
- Multi-currency Net Worth
- Net Worth forecasting
- Scenario planning
- Debt-payoff impact projections
- Liquidity stress testing
- Estate and inheritance planning
- Insurance coverage analysis
- Asset concentration analysis
- Net Worth mission plans
- Milestone celebrations
- Advisor-ready exports
- AI-assisted Net Worth explanations
- Historical change attribution
- Automated duplicate detection
- Legal-entity ownership modeling

---

# 23. Product Decisions

## Asset and Liability Coverage

Athena will support all reasonable user-approved assets and liabilities.

Users may include or exclude any eligible item.

## Manual Valuations

Manual assets and liabilities will use customizable user inputs and clearly display manual status and last update time.

## Primary Residence

A primary residence will be included by default once the user identifies as a homeowner and adds the property.

The user may exclude it.

## Secured Debt

Property and other secured assets will show gross value, associated debt, and resulting equity.

## Refresh Cadence

Refresh frequency will vary by data type:

- Provider-connected financial data: provider sync cadence
- Market assets: real time, delayed, or last sync
- Real estate: approximately monthly
- Vehicles: monthly or quarterly
- Manual assets: user updated with review reminders

## Exclusions

Users may exclude any asset, liability, or account without deleting the underlying record.

## Ownership Views

Athena will support individual and household Net Worth views.

## Liquid Net Worth

Liquid Net Worth will be displayed as a secondary metric.

## Retirement Assets

Retirement assets will be included in Total Net Worth and displayed separately from immediately accessible assets.

## Historical Snapshots

Athena will store monthly snapshots and material-event snapshots while calculating Current Net Worth dynamically.

## Valuation Quality

Freshness and valuation confidence will remain separate concepts.

## Confidence Engine

Net Worth will contribute evidence to the existing Confidence Engine without independently defining financial confidence.

## Goals and Milestones

Athena will support Net Worth goals, milestones, trend tracking, and related missions.

---

# 24. Revision History

| Version | Date       | Author         | Summary                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------- | ---------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1.0.0   | 2026-08-03 | Caitlin Gillum | Established the Net Worth product specification, defining asset and liability coverage, manual valuations, real estate equity, ownership views, inclusion controls, Total and Liquid Net Worth, retirement-asset treatment, refresh behavior, valuation confidence, historical snapshots, goals and milestones, relationships to Goals, Investments, Retirement, and the Confidence Engine, safety principles, future roadmap, and foundational product decisions. |
