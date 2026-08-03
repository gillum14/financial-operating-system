# Reports Model

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
4. Report
5. Report Period
6. Report Metric
7. Report Series
8. Aggregation
9. Comparison
10. Trend
11. Insight
12. Report Snapshot
13. Report Generation
14. Data Freshness
15. Household Reporting
16. Relationship to Accounts
17. Relationship to Transactions
18. Relationship to Budgets
19. Relationship to Goals
20. Relationship to Investments
21. Relationship to Retirement
22. Relationship to Net Worth
23. Relationship to the Confidence Engine
24. Safety and Validation Rules
25. Future Enhancements
26. Revision History

---

# 1. Purpose

The Reports domain provides Athena's financial intelligence layer.

Unlike other domains, Reports does not own financial records.

Instead, it aggregates canonical data from across Athena into historical summaries, trends, comparisons, and insights.

The Reports domain owns:

- Report definitions
- Aggregations
- Time periods
- Trend construction
- Comparison logic
- Report presentation
- Historical report snapshots

It does not own the underlying financial data.

---

# 2. Design Philosophy

The Reports domain follows several guiding principles.

## Aggregation Rather Than Ownership

Reports consume financial data.

They never duplicate ownership of financial records.

---

## Explainability

Every reported value should be traceable to its originating domain.

---

## Historical Integrity

Historical reports should reference immutable historical snapshots whenever available.

Athena should never rewrite history using today's financial values.

---

## Deterministic

The same inputs should always produce the same report.

---

## Extensible

New reports should be added without redesigning the reporting architecture.

---

# 3. Core Entities

The Reports domain consists of:

- Report
- Report Period
- Report Metric
- Report Series
- Aggregation
- Comparison
- Trend
- Insight
- Report Snapshot

---

# 4. Report

A Report represents a single financial report.

Each report may contain:

- Report ID
- Owner ID
- Report Type
- Reporting Period
- Generation Timestamp
- Snapshot Reference
- Current Status
- Created Timestamp

Supported report types include:

- Spending
- Income
- Savings
- Cash Flow
- Budget
- Goals
- Investments
- Retirement
- Net Worth
- Confidence

---

# 5. Report Period

Report Period defines the time range covered by a report.

Each period may contain:

- Period ID
- Start Date
- End Date
- Preset
- Custom Flag

Supported presets include:

- This Month
- Last Month
- Last 3 Months
- Last 6 Months
- Year to Date
- This Year
- Last Year
- All Time
- Custom

---

# 6. Report Metric

Report Metrics represent calculated financial values.

Each metric may contain:

- Metric ID
- Report ID
- Metric Name
- Metric Value
- Unit
- Display Format
- Source Domain

Examples include:

- Total Spending
- Total Income
- Net Income
- Savings Rate
- Budget Utilization
- Net Worth
- Portfolio Return

Metrics should remain deterministic.

---

# 7. Report Series

Report Series represents time-based data.

Each series may contain:

- Series ID
- Report ID
- Label
- Time Interval
- Ordered Data Points
- Display Type

Display types may include:

- Line
- Bar
- Area
- Table

Series remain presentation-independent.

---

# 8. Aggregation

Aggregations define how raw financial data becomes report metrics.

Aggregation metadata may include:

- Aggregation ID
- Source Domain
- Aggregation Method
- Included Filters
- Calculation Version
- Generated Timestamp

Aggregation methods may include:

- Sum
- Average
- Minimum
- Maximum
- Percentage
- Count
- Growth Rate

---

# 9. Comparison

Comparisons relate one reporting period to another.

Each comparison may contain:

- Comparison ID
- Current Period
- Previous Period
- Absolute Difference
- Percentage Difference
- Trend Direction

Comparisons should remain optional.

Historical reports should never fabricate missing comparison data.

---

# 10. Trend

Trend represents historical financial movement.

Each trend may contain:

- Trend ID
- Report ID
- Trend Type
- Direction
- Magnitude
- Supporting Series

Trend direction may include:

- Improving
- Stable
- Declining

Trends summarize historical movement.

They do not predict the future.

---

# 11. Insight

Insights represent meaningful financial observations.

Each insight may contain:

- Insight ID
- Report ID
- Priority
- Title
- Description
- Supporting Metrics
- Generated Timestamp

Insights should remain explainable.

Every insight should reference the evidence used to produce it.

---

# 12. Report Snapshot

Report Snapshots preserve historical reporting.

Each snapshot may contain:

- Snapshot ID
- Report ID
- Snapshot Date
- Report Period
- Included Metrics
- Calculation Version
- Generated Timestamp

Snapshots are immutable.

Historical reports should reference snapshots whenever possible.

---

# 13. Report Generation

Each generated report should record:

- Generation Timestamp
- Data Sources
- Calculation Version
- Snapshot Usage
- Generation Duration
- Completion Status

Generation metadata supports reproducibility and diagnostics.

---

# 14. Data Freshness

Reports should expose freshness metadata.

Possible values include:

- Live
- Recently Generated
- Snapshot
- Stale
- Unknown

Freshness should always be displayed independently from reporting period.

---

# 15. Household Reporting

Future household reporting supports:

- Shared reports
- Household spending
- Household Net Worth
- Household budgets
- Shared goals

Household reports remain subject to ownership permissions.

---

# 16. Relationship to Accounts

Accounts provide:

- Account balances
- Institution metadata
- Ownership

Reports consume account information without modifying it.

---

# 17. Relationship to Transactions

Transactions provide:

- Spending
- Income
- Transfers
- Categories

Reports aggregate transaction activity.

Transactions remain authoritative.

---

# 18. Relationship to Budgets

Budgets provide:

- Planned spending
- Budget utilization
- Variance
- Budget health

Reports summarize budget performance.

---

# 19. Relationship to Goals

Goals provide:

- Progress
- Contributions
- Completion

Reports summarize goal performance.

---

# 20. Relationship to Investments

Investments provide:

- Portfolio value
- Allocation
- Performance
- Returns

Reports aggregate investment performance.

---

# 21. Relationship to Retirement

Retirement provides:

- Readiness
- Contributions
- Projections

Reports summarize retirement progress.

---

# 22. Relationship to Net Worth

Net Worth provides:

- Historical snapshots
- Asset growth
- Liability reduction
- Equity growth

Reports summarize long-term wealth trends.

---

# 23. Relationship to the Confidence Engine

The Confidence Engine provides:

- Confidence Score
- Confidence trends
- Dimension scores
- Supporting explanations

Reports visualize historical confidence performance.

Confidence calculations remain external.

---

# 24. Safety and Validation Rules

The Reports model should enforce:

- Owner-scoped reports
- Canonical source references
- Deterministic calculations
- Immutable historical snapshots
- Explicit reporting periods
- Valid comparison periods
- Valid aggregation methods
- Versioned calculations
- Data freshness visibility

Athena must never:

- Duplicate financial ownership
- Fabricate historical values
- Rewrite historical reports
- Present stale information as current
- Generate unexplained insights

Unknown states should fail safely.

---

# 25. Future Enhancements

Future capabilities may include:

- AI-generated reports
- Predictive analytics
- Scheduled reports
- Report subscriptions
- Advisor reports
- Business reporting
- Tax reporting
- Interactive dashboards
- Benchmark comparisons
- Forecasting
- Scenario modeling
- Export jobs
- Natural-language summaries

---

# 26. Revision History

| Version | Date       | Author         | Summary                                                                                                                                                                                                                                                                                                      |
| ------- | ---------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1.0.0   | 2026-08-03 | Caitlin Gillum | Established the canonical Reports domain model defining reports, reporting periods, metrics, series, aggregations, comparisons, trends, insights, historical snapshots, report generation, data freshness, household reporting, relationships to Athena domains, validation rules, and future extensibility. |
