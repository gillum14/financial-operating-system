# Categories Specification

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
2. Product Philosophy
3. Goals
4. Non-Goals
5. User Experience
6. Information Architecture
7. Category Hierarchy
8. Category Management
9. Searching
10. Ordering
11. Usage Counts
12. Colors
13. Archiving
14. Transaction Protection
15. Empty States
16. Future Enhancements
17. Open Questions
18. Success Metrics
19. Decisions

---

# 1. Purpose

Categories define how every financial event inside Athena is organized.

They are a foundational configuration object that powers:

- Transactions
- Budgets
- Reports
- Goals
- Confidence calculations
- Financial insights
- Recommendation Engine

Every transaction should ultimately belong to exactly one category.

---

# 2. Product Philosophy

Categories are **configuration**, not analytics.

Unlike Dashboard or Reports, Categories exists to help users maintain a clean financial operating system.

The experience should emphasize:

- Clarity
- Speed
- Organization
- Consistency

Users should spend very little time here while still feeling confident their financial data is accurately organized.

---

# 3. Goals

The Categories experience should allow users to:

- Create categories
- Create subcategories
- Edit categories
- Archive categories
- Search categories
- Reorder categories
- Reorder subcategories
- Understand category usage
- Maintain long-term organization

---

# 4. Non-Goals

The Categories page is **not** intended to:

- Display spending analytics
- Display charts
- Display budgeting metrics
- Replace Reports
- Replace Transactions

---

# 5. User Experience

The page follows Athena's management workspace pattern.

Layout:

```text
Header

Search

Summary Cards

Category Management Table

Right Sidebar
    Quick Tips
    Create / Edit Category
```

The page intentionally does **not** include:

- Utility rail
- Dashboard widgets
- Tab navigation

---

# 6. Information Architecture

Each top-level category displays:

- Name
- Color
- Number of subcategories
- Transaction usage count
- Actions

Expanding a category reveals:

- All subcategories
- Usage count
- Inline subcategory creation row

Hierarchy depth is intentionally limited.

---

# 7. Category Hierarchy

Version 1 supports:

```text
Top Level Category
    ├── Subcategory
    ├── Subcategory
    └── Subcategory
```

Only two levels exist.

Nested subcategories are intentionally unsupported.

This keeps:

- Reporting simple
- Budgeting predictable
- User experience understandable

---

# 8. Category Management

Users may:

- Create top-level categories
- Create subcategories
- Rename categories
- Change colors
- Add descriptions
- Reorder categories
- Reorder subcategories
- Archive categories

Editing uses Athena's shared dialog pattern.

The same form supports:

- Create
- Edit

---

# 9. Searching

A single search field appears above the category list.

Search matches:

- Category name
- Subcategory name

Results update immediately.

No advanced filters are included in Version 1.

---

# 10. Ordering

Version 1 supports drag-and-drop ordering.

Users may reorder:

- Top-level categories
- Subcategories within the same parent

Ordering is persisted.

Athena always preserves user-defined ordering throughout the application.

Alphabetical ordering is not enforced.

---

# 11. Usage Counts

Every category displays transaction usage.

Example:

```text
Housing

6 subcategories

421 transactions
```

```text
Fuel

84 transactions
```

If counts cannot be accurately calculated, Athena displays an honest placeholder rather than fabricated values.

---

# 12. Colors

Each category has a user-selectable accent color.

Version 1 uses colored indicators only.

Example:

```text
● Housing

● Income

● Transportation
```

Category icons are intentionally excluded from Version 1.

Future releases may introduce optional icons.

---

# 13. Archiving

Categories are never immediately deleted.

Available actions:

```text
Edit

Archive
```

Archived categories:

- Disappear from normal lists
- Remain available for historical references
- Preserve transaction integrity

Permanent deletion is deferred to a future version.

---

# 14. Transaction Protection

Athena must never allow actions that compromise historical financial records.

Categories referenced by:

- Transactions
- Budgets
- Goals
- Reports

must maintain referential integrity.

If archiving affects existing references, Athena clearly communicates the outcome before confirmation.

---

# 15. Empty States

When no categories exist, Athena displays:

- Onboarding message
- Create Category form
- Quick Tips

No placeholder analytics or fabricated metrics should appear.

---

# 16. Future Enhancements

Potential future additions include:

- Category icons
- Bulk editing
- Merge categories
- Category templates
- AI category recommendations
- Automatic categorization confidence
- Recently used categories
- Category history
- Archived category manager

These are intentionally outside the scope of Version 1.

---

# 17. Open Questions

None.

All Version 1 behavior has been approved.

---

# 18. Success Metrics

A successful Categories experience should enable users to:

- Quickly find categories
- Organize financial data efficiently
- Maintain consistent financial organization
- Confidently understand category usage
- Minimize long-term maintenance effort

---

# 19. Decisions

## Hierarchy

Categories support exactly two levels:

- Top-level category
- Subcategory

No deeper nesting.

---

## Search

Single real-time search field.

No advanced filtering.

---

## Ordering

Drag-and-drop ordering is supported in Version 1.

Ordering persists across Athena.

---

## Create/Edit

A shared dialog supports both:

- Create
- Edit

---

## Archive

Categories are archived rather than immediately deleted.

---

## Usage Counts

Transaction counts are displayed whenever real values are available.

---

## Colors

User-selectable accent colors.

Icons are deferred to a future release.

---

## Category Icons

Not included in Version 1.

Future support remains under consideration.

---

## Analytics

The Categories page is an administrative workspace, not an analytics dashboard.

No charts or reporting widgets are included.

---

## Product Principle

Categories should remain simple, predictable, and fast to manage while serving as the organizational backbone of Athena's Financial Operating System.

---

# 20. Revision History

| Version | Date       | Author         | Summary                                                                                                                                                                                                                                                                  |
| ------- | ---------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1.0.0   | 2026-08-06 | Caitlin Gillum | Established the Categories product specification defining Athena's category hierarchy, management workflows, drag-and-drop ordering, search, usage counts, color indicators, archiving behavior, transaction protection, user experience principles, and future roadmap. |
