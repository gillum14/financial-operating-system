# Transactions Specification

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
4. Transaction Lifecycle
5. Transaction Types
6. Transaction Sources
7. Merchant Normalization
8. Categorization
9. AI Categorization
10. Transaction Rules
11. Split Transactions
12. Transfers
13. Excluded Transactions
14. Notes and Attachments
15. Search and Filtering
16. Bulk Operations
17. Import Behavior
18. Editing
19. Recurring Transaction Detection
20. Data Freshness
21. Household Ownership
22. Relationship to Accounts
23. Relationship to Budgets
24. Relationship to Reports
25. Relationship to Goals
26. Relationship to Net Worth
27. Relationship to Investments
28. Relationship to Missions
29. Relationship to the Confidence Engine
30. User Experience
31. Security and Privacy
32. Future Enhancements
33. Product Decisions
34. Revision History

---

# 1. Purpose

The Transactions domain represents the complete financial activity of a user.

Every movement of money that enters, exits, or transfers between financial accounts is represented as a transaction.

Transactions provide the foundation for:

- Budgets
- Reports
- Cash Flow
- Goals
- Net Worth
- Missions
- Recommendations
- Confidence calculations

Without trustworthy transaction data, Athena cannot accurately understand a user's financial behavior.

---

# 2. Product Philosophy

Transactions should answer:

- What happened?
- Where did it happen?
- Why did it happen?
- How does it affect my finances?

The experience should prioritize:

- Accuracy
- Explainability
- Searchability
- Organization
- Speed
- Transparency

Athena should never obscure original financial records.

Users should always be able to distinguish between:

- Original provider data
- User edits
- AI suggestions
- System-generated metadata

---

# 3. Core Principles

## Preserve Original Data

Provider transaction data should never be overwritten.

Athena stores enhancements separately.

---

## Explainability

Every category, rule, recommendation, and AI decision should be explainable.

---

## Flexible

Users should be able to:

- Edit categories
- Add notes
- Attach files
- Split transactions
- Exclude transactions
- Override AI decisions

---

## Deterministic

Financial calculations should produce the same results given the same transaction set.

---

## Auditability

Every meaningful transaction modification should remain historically traceable.

---

# 4. Transaction Lifecycle

Transactions progress through several states.

Possible lifecycle stages include:

- Imported
- Pending
- Posted
- Categorized
- Reviewed
- Edited
- Reconciled
- Archived

Not every transaction must pass through every state.

Pending transactions should automatically transition when providers confirm posting.

---

# 5. Transaction Types

Supported transaction types include:

- Income
- Expense
- Transfer
- Refund
- Fee
- Interest
- Dividend
- Adjustment
- Payment
- Purchase
- Withdrawal
- Deposit

Additional transaction types may be introduced in future versions.

---

# 6. Transaction Sources

Transactions may originate from:

- Connected financial institutions
- Investment providers
- Manual entry
- CSV import
- Future accounting integrations

Every transaction should clearly identify its source.

---

# 7. Merchant Normalization

Merchant normalization improves readability while preserving original provider descriptions.

Each transaction should maintain:

- Original description
- Normalized merchant
- Merchant logo (future)
- Merchant category (future)

Users should always be able to view the original provider description.

---

# 8. Categorization

Every transaction may be assigned a category.

Categories may be assigned by:

- User
- Transaction rule
- AI
- Manual import
- Future provider metadata

Users may override any automatic categorization.

---

# 9. AI Categorization

Future AI categorization should provide:

- Suggested category
- Confidence score
- Explanation
- Ability to accept or reject
- Optional learning from user corrections

AI suggestions must never silently replace user decisions.

---

# 10. Transaction Rules

Users may create rules that automatically classify transactions.

Rules may match on:

- Merchant
- Amount
- Description
- Account
- Category
- Transaction type

Rules should execute deterministically.

Users should be able to enable, disable, edit, and delete rules.

---

# 11. Split Transactions

Users may divide one transaction into multiple categorized portions.

Each split should preserve:

- Parent transaction
- Split amounts
- Split categories
- Split notes

Split totals must always equal the original transaction amount.

---

# 12. Transfers

Transfers represent movement between a user's own accounts.

Transfers should:

- Avoid double counting
- Be linked together
- Exclude themselves from spending calculations
- Remain visible in account history

Transfer detection should be explainable and user-correctable.

---

# 13. Excluded Transactions

Users may exclude transactions from financial calculations.

Excluded transactions remain:

- Visible
- Searchable
- Editable
- Auditable

Exclusion affects downstream calculations but never deletes the transaction.

---

# 14. Notes and Attachments

Transactions may contain:

- Notes
- Receipts
- Invoices
- Images
- Documents

Attachments should remain associated with the transaction throughout its lifecycle.

---

# 15. Search and Filtering

Users should be able to search using:

- Merchant
- Description
- Amount
- Date
- Category
- Account
- Transaction type
- Notes

Filters should support combinations of multiple criteria.

---

# 16. Bulk Operations

Users may perform bulk actions including:

- Categorize
- Exclude
- Include
- Delete manual transactions
- Add notes
- Apply rules

Bulk actions should provide confirmation before execution.

---

# 17. Import Behavior

Imported transactions should preserve:

- Original provider identifiers
- Original timestamps
- Original descriptions

Duplicate detection should prevent multiple imports of the same transaction.

---

# 18. Editing

Users may edit:

- Merchant
- Category
- Notes
- Attachments
- Exclusion status
- Split information

Provider-supplied fields should remain historically available.

---

# 19. Recurring Transaction Detection

Future versions should detect recurring financial activity.

Examples include:

- Mortgage
- Rent
- Payroll
- Utilities
- Insurance
- Subscription services

Recurring detection should remain probabilistic and explainable.

---

# 20. Data Freshness

Each transaction should expose freshness metadata appropriate to its source.

Possible states include:

- Pending
- Posted
- Recently Imported
- Manual
- Unknown

---

# 21. Household Ownership

Transactions inherit ownership from their originating account.

Future household functionality should respect ownership permissions while supporting household reporting.

---

# 22. Relationship to Accounts

Accounts remain authoritative for:

- Account identity
- Institution
- Balance
- Ownership

Transactions reference Accounts.

---

# 23. Relationship to Budgets

Budgets consume categorized spending derived from Transactions.

Transactions remain the authoritative financial activity.

---

# 24. Relationship to Reports

Reports aggregate transaction data into financial summaries.

Reports never own transaction records.

---

# 25. Relationship to Goals

Goal contributions may originate from transactions.

Goals reference transactions but do not own them.

---

# 26. Relationship to Net Worth

Transactions indirectly influence Net Worth through account balances.

Net Worth calculations should not duplicate transaction history.

---

# 27. Relationship to Investments

Investment purchases and sales may originate as transactions while investment performance remains owned by Investments.

---

# 28. Relationship to Missions

Future missions may reference transaction activity such as:

- Savings deposits
- Budget adherence
- Debt payments
- Spending habits

Mission completion should never alter transaction history.

---

# 29. Relationship to the Confidence Engine

Transactions provide evidence including:

- Spending behavior
- Savings behavior
- Income stability
- Cash flow
- Budget adherence
- Financial habits

Transactions contribute evidence.

The Confidence Engine remains responsible for confidence calculations.

---

# 30. User Experience

The Transactions experience should prioritize:

- Fast searching
- Quick categorization
- Explainable automation
- Bulk editing
- Clear visual hierarchy
- Minimal friction

Users should feel confident that every financial movement can be understood.

---

# 31. Security and Privacy

Transactions contain highly sensitive financial information.

Athena should enforce:

- Owner-scoped authorization
- Secure provider synchronization
- Encrypted storage
- Audit logging
- Household permission validation

Transaction history must never be exposed to unauthorized users.

---

# 32. Future Enhancements

Future capabilities may include:

- AI categorization
- Receipt OCR
- Tax categorization
- Smart merchant detection
- Geolocation
- Tags
- Custom fields
- Subscription detection
- Cash transaction tracking
- Recurring transaction management
- AI spending explanations
- Duplicate detection improvements
- Automatic transfer matching
- Advanced reconciliation
- Multi-currency transactions

---

# 33. Product Decisions

## Original Data

Original provider data will always be preserved.

## Categorization

Users may override every automated category.

## Rules

Rules remain deterministic and user-controlled.

## Transfers

Transfers are linked and excluded from spending totals.

## Split Transactions

Split totals must always equal the original transaction amount.

## Excluded Transactions

Excluded transactions remain visible and auditable.

## AI

AI suggestions remain optional and explainable.

## Domain Ownership

Transactions remain the canonical record of financial activity throughout Athena.

---

# 34. Revision History

| Version | Date       | Author         | Summary                                                                                                                                                                                                                                                                                                     |
| ------- | ---------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0.0   | 2026-08-03 | Caitlin Gillum | Established the Transactions product specification defining transaction lifecycle, categorization, merchant normalization, rules, split transactions, transfers, exclusions, search, bulk operations, imports, editing, recurring detection, domain relationships, security principles, and future roadmap. |
