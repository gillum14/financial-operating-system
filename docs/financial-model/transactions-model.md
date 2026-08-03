# Transactions Model

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
4. Transaction
5. Merchant
6. Category Assignment
7. Transaction Rule
8. Split Transaction
9. Transfer Relationship
10. Transaction Attachment
11. Transaction Note
12. Pending Transaction
13. Recurring Transaction
14. Transaction Snapshot
15. Transaction Lifecycle
16. Data Freshness
17. Ownership Model
18. Relationship to Accounts
19. Relationship to Budgets
20. Relationship to Reports
21. Relationship to Goals
22. Relationship to Net Worth
23. Relationship to Investments
24. Relationship to Missions
25. Relationship to the Confidence Engine
26. Safety and Validation Rules
27. Future Enhancements
28. Revision History

---

# 1. Purpose

The Transactions domain is the authoritative record of financial activity within Athena.

It models every movement of money regardless of source, including:

- Income
- Expenses
- Transfers
- Interest
- Fees
- Refunds
- Adjustments
- Manual transactions

Nearly every financial domain consumes transaction data.

The Transactions domain owns financial activity.

It does not own account balances or financial calculations performed elsewhere.

---

# 2. Design Philosophy

The Transactions domain follows several guiding principles.

## Preserve Original Data

Provider data remains immutable.

Enhancements such as categories, notes, AI suggestions, and rules are layered on top of the original transaction.

---

## Explainability

Every enhancement should identify:

- Source
- Confidence
- User overrides
- Rule application
- AI involvement

---

## Deterministic

Given the same transaction set, Athena should always produce identical financial calculations.

---

## Extensible

The model should support future capabilities without redesigning existing entities.

Examples include:

- AI categorization
- Tax classification
- Receipt OCR
- Subscription detection

---

## Auditable

Meaningful transaction changes should remain historically traceable.

---

# 3. Core Entities

The Transactions domain consists of:

- Transaction
- Merchant
- Category Assignment
- Transaction Rule
- Split Transaction
- Transfer Relationship
- Transaction Attachment
- Transaction Note
- Pending Transaction
- Recurring Transaction
- Transaction Snapshot

---

# 4. Transaction

Transaction represents one financial event.

Each transaction may contain:

- Transaction ID
- Owner ID
- Account ID
- Provider Transaction ID
- Transaction Type
- Amount
- Currency
- Transaction Date
- Posted Date
- Original Description
- Merchant ID
- Category Assignment
- Pending status
- Excluded status
- Manual transaction flag
- Transfer reference
- Split reference
- Freshness
- Created timestamp
- Updated timestamp

Transactions maintain one canonical identity.

---

# 5. Merchant

Merchant represents normalized merchant information.

Each merchant may contain:

- Merchant ID
- Display Name
- Original Description
- Normalized Name
- Merchant Category
- Logo reference (future)
- Website (future)

Multiple transactions may reference the same merchant.

---

# 6. Category Assignment

Category Assignment stores transaction categorization.

Each assignment may include:

- Assignment ID
- Transaction ID
- Category ID
- Assignment Source
- Confidence
- User Override
- Assigned Timestamp

Assignment sources include:

- User
- Rule
- AI
- Import
- Provider

Only one active category assignment exists at a time.

Historical assignments remain auditable.

---

# 7. Transaction Rule

Transaction Rules automate categorization.

Each rule may include:

- Rule ID
- Owner ID
- Rule Name
- Match Criteria
- Assigned Category
- Enabled Flag
- Priority
- Created Timestamp
- Updated Timestamp

Rules execute deterministically.

---

# 8. Split Transaction

Split Transactions divide one transaction into multiple financial components.

Each split contains:

- Split ID
- Parent Transaction ID
- Category
- Amount
- Note
- Created Timestamp

Validation requires:

```text
Sum(Split Amounts)
=
Parent Transaction Amount
```

---

# 9. Transfer Relationship

Transfers link two related transactions.

Each transfer may contain:

- Transfer ID
- Source Transaction
- Destination Transaction
- Transfer Status
- Detection Method
- Created Timestamp

Transfers prevent double counting.

---

# 10. Transaction Attachment

Attachments store supporting documents.

Examples include:

- Receipts
- Invoices
- Images
- PDFs
- Statements

Each attachment contains:

- Attachment ID
- Transaction ID
- File Reference
- File Type
- Uploaded Timestamp

---

# 11. Transaction Note

Notes store user-provided context.

Each note contains:

- Note ID
- Transaction ID
- Content
- Created Timestamp
- Updated Timestamp

Notes never modify transaction data.

---

# 12. Pending Transaction

Pending Transactions represent financial activity awaiting provider confirmation.

Pending records may contain:

- Pending ID
- Transaction ID
- Expected Posted Date
- Provider Status
- Created Timestamp

Pending transactions should automatically resolve after posting.

---

# 13. Recurring Transaction

Recurring Transaction represents detected financial patterns.

Each recurring definition may contain:

- Recurring ID
- Merchant
- Frequency
- Expected Amount
- Confidence
- Last Detection
- Next Expected Date

Recurring detection remains probabilistic.

Individual transactions remain authoritative.

---

# 14. Transaction Snapshot

Future Transaction Snapshots preserve historical reporting.

Each snapshot may contain:

- Snapshot ID
- Snapshot Date
- Transaction Count
- Income Total
- Expense Total
- Transfer Total
- Category Totals
- Calculation Version

Snapshots are immutable.

---

# 15. Transaction Lifecycle

Transactions progress through lifecycle states.

Supported states include:

- Imported
- Pending
- Posted
- Categorized
- Reviewed
- Edited
- Reconciled
- Archived

Lifecycle reflects processing state.

It does not describe financial quality.

---

# 16. Data Freshness

Each transaction exposes freshness metadata.

Possible values include:

- Pending
- Posted
- Recently Imported
- Manual
- Unknown

Freshness remains independent from categorization.

---

# 17. Ownership Model

Transactions inherit ownership from the originating account.

Supported ownership includes:

- Individual
- Joint
- Household

Ownership affects downstream reporting.

---

# 18. Relationship to Accounts

Accounts remain authoritative for:

- Account identity
- Institution
- Ownership
- Balances

Transactions reference Accounts.

---

# 19. Relationship to Budgets

Budgets consume categorized transaction activity.

Transactions remain the canonical financial record.

---

# 20. Relationship to Reports

Reports aggregate transaction data into financial summaries.

Reports never own transaction records.

---

# 21. Relationship to Goals

Goals may reference qualifying transactions as contributions.

Transactions remain unchanged regardless of goal progress.

---

# 22. Relationship to Net Worth

Transactions indirectly affect Net Worth through account balances.

Net Worth should never reconstruct transaction history.

---

# 23. Relationship to Investments

Investment purchases and sales originate as transactions.

Investment analytics remain owned by the Investments domain.

---

# 24. Relationship to Missions

Missions may reference transaction activity.

Mission completion never modifies transaction history.

---

# 25. Relationship to the Confidence Engine

The Transactions domain supplies evidence including:

- Spending behavior
- Saving behavior
- Income consistency
- Cash flow
- Budget adherence
- Financial habits
- Categorization completeness

Transactions contribute evidence.

The Confidence Engine remains responsible for scoring.

---

# 26. Safety and Validation Rules

The Transactions model should enforce:

- Owner-scoped access
- One canonical transaction identity
- Immutable provider data
- Explicit category assignment
- Valid transfer relationships
- Split totals equal parent totals
- Explicit freshness
- Explicit ownership
- Audit history preservation

Athena must never:

- Modify original provider records
- Double count transfers
- Lose transaction history
- Present AI suggestions as user decisions
- Hide excluded transactions
- Break historical references

Unknown states should fail safely.

---

# 27. Future Enhancements

Future capabilities may include:

- AI categorization
- Receipt OCR
- Tax classification
- Subscription detection
- Merchant intelligence
- Geolocation
- Tags
- Custom fields
- Duplicate detection
- Advanced reconciliation
- Cash transaction tracking
- Spending anomaly detection
- AI transaction explanations
- Multi-currency transactions
- Historical transaction versioning

---

# 28. Revision History

| Version | Date       | Author         | Summary                                                                                                                                                                                                                                                                                                  |
| ------- | ---------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0.0   | 2026-08-03 | Caitlin Gillum | Established the canonical Transactions domain model defining transaction entities, merchants, category assignments, rules, transfers, split transactions, attachments, notes, recurring activity, lifecycle, ownership, relationships to downstream domains, validation rules, and future extensibility. |
