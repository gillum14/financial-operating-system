# Categories Model

**Project:** Financial Operating System

**Internal Codename:** Athena

**Document Version:** 1.0.0

**Status:** Draft

**Owner:** Caitlin Gillum

**Primary Architect:** Caitlin Gillum

**Technical Advisor:** OpenAI ChatGPT

**Last Updated:** August 06, 2026

---

# Table of Contents

1. Purpose
2. Design Philosophy
3. Core Entities
4. Category
5. Category Hierarchy
6. Category Ordering
7. Category Usage
8. Category Color
9. Category Lifecycle
10. Category Search
11. Category Relationships
12. Relationship to Transactions
13. Relationship to Budgets
14. Relationship to Reports
15. Relationship to Goals
16. Relationship to the Confidence Engine
17. Safety and Validation Rules
18. Future Enhancements
19. Revision History

---

# 1. Purpose

The Categories domain provides the organizational structure for Athena's financial data.

Every financial transaction is ultimately classified into a category, allowing Athena to provide meaningful budgeting, reporting, recommendations, confidence calculations, and financial insights.

The Categories domain owns:

- Category definitions
- Category hierarchy
- Category ordering
- Category presentation
- Category lifecycle

It does **not** own financial activity.

Transactions remain the authoritative source of financial events.

---

# 2. Design Philosophy

The Categories domain follows several guiding principles.

## Organizational Backbone

Categories provide the common language used across Athena.

Every financial feature should reference the same canonical category definitions.

---

## Simplicity

Categories should remain easy to understand and maintain.

The hierarchy intentionally supports only two levels.

---

## Consistency

Category ordering, naming, and hierarchy should remain consistent throughout the application.

---

## Flexibility

Users should be able to customize categories without affecting historical financial records.

---

## Deterministic

Every transaction should resolve to exactly one active category.

---

# 3. Core Entities

The Categories domain consists of:

- Category
- Category Hierarchy
- Category Ordering
- Category Usage
- Category Color

---

# 4. Category

A Category represents a financial classification.

Each category may contain:

- Category ID
- Owner ID
- Display Name
- Description
- Parent Category ID (optional)
- Accent Color
- Display Order
- Archived Status
- Created Timestamp
- Updated Timestamp

Each category has one canonical identity.

---

# 5. Category Hierarchy

Categories support exactly two hierarchy levels.

```text
Top-Level Category
    ├── Subcategory
    ├── Subcategory
    └── Subcategory
```

Rules:

- Top-level categories may contain subcategories.
- Subcategories may not contain additional children.
- Circular relationships are prohibited.
- Self-parenting is prohibited.

These rules are enforced by the domain.

---

# 6. Category Ordering

Categories maintain persistent display ordering.

Ordering includes:

- Top-level category order
- Subcategory order within each parent

Users may reorder categories using drag-and-drop.

Ordering should remain consistent across:

- Transactions
- Budgets
- Reports
- Goals
- Category Management

Ordering is user-defined rather than alphabetical.

---

# 7. Category Usage

Each category may expose usage metadata.

Usage information may include:

- Transaction Count
- Budget References
- Goal References
- Last Used Timestamp

Usage metadata supports presentation only.

Financial calculations remain owned by their respective domains.

---

# 8. Category Color

Each category stores a user-defined accent color.

Version 1 supports:

- Colored indicators
- Consistent presentation across Athena

Version 1 intentionally excludes category icons.

Future releases may support optional icons.

---

# 9. Category Lifecycle

Categories progress through the following states:

- Active
- Archived

Categories are never immediately deleted.

Archiving preserves historical relationships while removing categories from active selection lists.

---

# 10. Category Search

Categories support simple name-based searching.

Search includes:

- Top-level category names
- Subcategory names

Search remains presentation functionality and does not modify the underlying hierarchy.

---

# 11. Category Relationships

Categories may be referenced by:

- Transactions
- Budgets
- Reports
- Goals
- Confidence Engine
- Recommendation Engine

Categories do not own these relationships.

They provide organizational references only.

---

# 12. Relationship to Transactions

Transactions reference Categories for financial classification.

Categories never own transaction data.

Changing a category should not modify historical transaction records.

---

# 13. Relationship to Budgets

Budget allocations reference Categories.

Categories define organization.

Budgets define planned financial allocations.

---

# 14. Relationship to Reports

Reports aggregate financial information using Categories.

Categories provide grouping.

Reports own calculations and visualizations.

---

# 15. Relationship to Goals

Goals may reference Categories when tracking planned contributions.

Categories remain organizational only.

Goal progress remains owned by the Goals domain.

---

# 16. Relationship to the Confidence Engine

Categories contribute organizational consistency.

Confidence calculations may consider:

- Categorization completeness
- Uncategorized transactions
- Category maintenance quality

The Confidence Engine owns all scoring logic.

---

# 17. Safety and Validation Rules

The Categories model should enforce:

- Owner-scoped categories
- Maximum hierarchy depth of two levels
- No circular references
- No self-parenting
- Persistent display ordering
- Archive instead of immediate deletion
- Referential integrity with Transactions
- Referential integrity with Budgets
- Referential integrity with Goals
- Referential integrity with Reports

Athena must never:

- Orphan historical transactions
- Allow invalid hierarchy structures
- Lose user-defined ordering
- Permanently remove referenced categories
- Break historical reporting

Unknown states should fail safely.

---

# 18. Future Enhancements

Future capabilities may include:

- Category icons
- Bulk editing
- Merge categories
- Category templates
- AI category suggestions
- Automatic category recommendations
- Recently used categories
- Archived category management
- Category analytics
- Household category sharing

---

# 19. Revision History

| Version | Date       | Author         | Summary                                                                                                                                                                                                                                       |
| ------- | ---------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0.0   | 2026-08-06 | Caitlin Gillum | Established the canonical Categories domain model defining category hierarchy, persistent ordering, usage metadata, color presentation, lifecycle, relationships to downstream financial domains, validation rules, and future extensibility. |
