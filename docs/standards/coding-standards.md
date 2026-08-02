# Coding Standards

**Project:** Financial Operating System

**Internal Codename:** Athena

**Document Version:** 1.1.0

**Status:** Draft

**Owner:** Caitlin Gillum

**Primary Architect:** Caitlin Gillum

**Technical Advisor:** OpenAI ChatGPT

**Last Updated:** August 2, 2026

---

# Table of Contents

- Purpose
- Scope
- Coding Philosophy
- Objectives
- Guiding Principles
- General Coding Standards
- TypeScript Standards
- React Standards
- Next.js Standards
- Server Action Standards
- Route Handler Standards
- Application Service Standards
- Domain Model Standards
- Repository Standards
- Database Access Standards
- Validation Standards
- Error Handling Standards
- Authentication Standards
- Authorization Standards
- Security Standards
- Performance Standards
- Accessibility Standards
- State Management Standards
- API Design Standards
- File Organization Standards
- Naming Conventions
- Function Standards
- Class Standards
- Component Standards
- Hook Standards
- Async Programming Standards
- Logging Standards
- Testing Standards
- Documentation Standards
- Code Comment Standards
- Dependency Standards
- Refactoring Standards
- Definition of Done
- Requirement Traceability
- Deferred Decisions
- Related Documents
- Revision History

---

# Purpose

This document establishes the coding standards for Project Athena.

Its purpose is to create a consistent engineering style that emphasizes readability, maintainability, correctness, security, performance, and long-term scalability.

Coding standards define how Athena is implemented—not just how it is formatted.

---

# Scope

These standards apply to:

- TypeScript
- React
- Next.js
- Server Actions
- Route Handlers
- Domain Services
- Application Services
- Repository Layer
- Database Access
- Tests
- Scripts
- Configuration
- Documentation examples

---

# Coding Philosophy

Code is written for humans first and computers second.

Readable code is easier to review, maintain, test, and secure.

The preferred solution is the simplest one that correctly solves the problem while preserving architectural consistency.

---

# Objectives

Athena's coding standards shall:

- Improve readability
- Reduce defects
- Encourage consistency
- Support testing
- Improve maintainability
- Preserve architectural boundaries
- Encourage secure development
- Promote performance awareness
- Simplify onboarding

---

# Guiding Principles

1. Favor clarity over cleverness.
2. Prefer composition over inheritance.
3. Keep functions small and focused.
4. One responsibility per module.
5. Explicit is better than implicit.
6. Fail safely.
7. Validate all external input.
8. Avoid premature optimization.
9. Minimize shared mutable state.
10. Every abstraction should have clear value.
11. Prefer immutable data where practical.
12. Write code that is easy to delete.
13. Optimize for maintainability.
14. Security is part of every feature.
15. Every line should justify its existence.

---

# General Coding Standards

Code should be:

- Predictable
- Consistent
- Deterministic
- Self-documenting
- Testable

Avoid unnecessary complexity.

Prefer descriptive code over explanatory comments.

---

# TypeScript Standards

Athena shall:

- Use strict mode
- Avoid `any`
- Prefer explicit types at public boundaries
- Use discriminated unions where appropriate
- Prefer interfaces for contracts
- Use readonly where practical
- Favor type inference for local variables
- Model domain concepts explicitly

---

# React Standards

Components should:

- Have one responsibility
- Remain small
- Be composable
- Avoid deep prop drilling
- Separate presentation from business logic
- Handle loading, empty, and error states

---

# Next.js Standards

Use:

- Server Components by default
- Client Components only when required
- Server Actions for trusted mutations
- Route Handlers for external APIs
- Streaming where appropriate
- Suspense intentionally

---

# Server Action Standards

Server Actions shall:

- Validate input
- Authenticate user
- Authorize operation
- Execute transaction
- Return typed results
- Avoid UI logic

## Implementation

The shared Server Action framework lives in `src/lib/actions/` and is the required foundation for every Server Action. It resolves the "Server Action error-return conventions" decision previously deferred in `docs/architecture/api-architecture.md`.

A Server Action's body shall be wrapped in `executeAction(name, run)` (`src/lib/actions/execute.ts`), which:

- Generates a per-invocation `correlationId`.
- Runs `run()` and returns `{ success: true, data }` on success.
- Catches anything `run()` throws, classifies it (`classifyError`), logs it safely (`logActionError`), and returns `{ success: false, error }` — never a raw exception.

Inside `run()`, an action composes:

- `requireActionUser()` (`src/lib/actions/context.ts`) — resolves the authenticated identity or throws `AuthenticationError`. Distinct from `requireAuthenticatedUser()` (Server Components/layouts), which redirects; a mutation must not hijack navigation mid-submission.
- `parseAction(schema, input)` (`src/lib/actions/validation.ts`) — validates with Zod and returns typed data, or throws `ValidationError` carrying `fieldErrors`.
- `assertAuthorized(condition, message?)` (`src/lib/actions/authorize.ts`) — throws `AuthorizationError` when a caller-supplied condition (e.g. an ownership check) fails. Carries no business rules itself.

Example shape:

```typescript
"use server";

export async function archiveAccount(rawInput: unknown): Promise<ActionResult<Account>> {
  return executeAction("archiveAccount", async () => {
    const user = await requireActionUser();
    const { accountId } = parseAction(archiveAccountSchema, rawInput);
    return accountService.archiveAccount(accountId, user.id);
  });
}
```

The owner id passed to an Application Service must always be `user.id` from `requireActionUser()` — never a field read out of `rawInput`, even if the client supplied one.

---

# Route Handler Standards

Route Handlers should:

- Be thin
- Delegate business logic
- Validate requests
- Return standardized responses
- Never contain domain logic

---

# Application Service Standards

Application Services coordinate workflows.

They should:

- Orchestrate operations
- Manage transactions
- Handle retries
- Call repositories
- Emit observability signals

They should not contain presentation concerns.

---

# Domain Model Standards

Domain models encapsulate business rules.

They should:

- Protect invariants
- Prevent invalid state
- Remain persistence-agnostic
- Avoid framework dependencies

---

# Repository Standards

Repositories:

- Encapsulate persistence
- Translate database errors
- Never expose SQL implementation details
- Return domain-oriented results

---

# Database Access Standards

Database code should:

- Use transactions for financial mutations
- Parameterize queries
- Avoid N+1 queries
- Use indexes intentionally
- Preserve consistency

---

# Validation Standards

Validate:

- Input shape
- Business rules
- Ownership
- Monetary precision
- File uploads

Never trust client input.

## Implementation

Server Actions validate through `parseAction(schema, input)` (`src/lib/actions/validation.ts`), the one approved path from untrusted input to typed data:

- Parses with a Zod schema via `safeParse`, never `parse` (no throwing directly from Zod into action code).
- On failure, formats issues with `z.flattenError()` into `{ fieldErrors: Record<string, string[]> }` and throws `ValidationError` (`src/domains/errors.ts`) carrying that structure.
- A raw `ZodError` — its `.issues`, internal codes, or `.message` — must never reach an `ActionResult`. `classifyError` enforces this: a `ValidationError`'s own message is always replaced with a fixed generic string; only `fieldErrors` passes through.

---

# Error Handling Standards

Errors should:

- Be typed
- Be translated at architectural boundaries
- Avoid leaking implementation details
- Preserve correlation identifiers
- Support retries when appropriate

## Implementation

Server Actions classify every thrown error through `classifyError` (`src/lib/actions/classify.ts`) into exactly six categories: `validation`, `authentication`, `authorization`, `domain`, `infrastructure`, `unexpected`. This resolves the "Final error-class implementation" decision previously deferred in `docs/architecture/error-handling-strategy.md`, scoped to the Server Action boundary.

- `validation` / `authentication` / `authorization` — from `ValidationError` / `AuthenticationError` / `AuthorizationError`. Message text is authored by this codebase (never derived from Zod or a provider), so it is safe to both log and return.
- `domain` — from `NotFoundError` / `ConflictError` (`src/domains/errors.ts`). These messages may embed internal identifiers (e.g. `"Account abc-123 not found for owner xyz-789"`) and are therefore never returned to the caller as-is; the user-facing message is always the fixed generic string for the category.
- `infrastructure` — duck-typed: an error named `DrizzleQueryError`/`PostgresError`, or one whose `.cause` carries a SQLSTATE-style `code`. Postgres error text can embed the actual offending value (e.g. a duplicate-key message including the conflicting email), so neither the message nor the cause is ever logged or returned — only the error's name and, if present, the `code`.
- `unexpected` — anything unrecognized. Same no-message-leaks rule as `infrastructure`.

Logging (`logActionError`, `src/lib/actions/logging.ts`) applies this same trust boundary: it logs `error.message` for the four "authored by us" categories, and only `error.name` (plus a safe `code` if present) for `infrastructure`/`unexpected` — it never logs the action's raw input. Every `ActionResult` failure carries a `correlationId` generated once per `executeAction()` call, safe to display for support reference.

---

# Authentication Standards

Authentication verifies identity.

Every protected operation shall verify an authenticated user before proceeding.

## Implementation

Server Actions call `requireActionUser()` (`src/lib/actions/context.ts`), not `requireAuthenticatedUser()`. Both resolve the same underlying session (`getAuthenticatedUser`, `src/lib/auth/authenticated-user.ts`), but `requireActionUser()` throws `AuthenticationError` — routed through `executeAction` into a typed `ActionResult` failure — instead of redirecting, since a mutation mid-submission must not hijack client-side navigation the way a Server Component page load safely can.

---

# Authorization Standards

Authorization verifies permissions.

Ownership shall always be enforced server-side.

Never trust authorization decisions made by the browser.

## Implementation

`assertAuthorized(condition, message?)` (`src/lib/actions/authorize.ts`) standardizes turning a failed authorization check into a typed, classified `AuthorizationError` — it does not itself define what "authorized" means for any given action. Ownership is derived from `requireActionUser()`'s returned identity and is enforced primarily through owner-scoped repository methods (`getByIdForOwner`, `update(id, ownerId, ...)`, etc.) and PostgreSQL Row Level Security, not by trusting an id read from the client.

---

# Security Standards

Code should:

- Follow least privilege
- Sanitize input
- Escape output
- Protect secrets
- Prevent injection
- Respect Row Level Security
- Minimize sensitive-data exposure

---

# Performance Standards

Optimize:

- Database queries
- Rendering
- Bundle size
- Network requests
- Caching

Avoid optimization without evidence.

---

# Accessibility Standards

All UI should:

- Support keyboard navigation
- Use semantic HTML
- Maintain focus
- Meet contrast requirements
- Include accessible labels

Accessibility is a feature, not an enhancement.

---

# State Management Standards

State should:

- Live at the lowest practical level
- Avoid duplication
- Prefer server state over client state
- Be derived when possible
- Remain predictable

---

# API Design Standards

APIs should:

- Be consistent
- Version intentionally
- Return predictable responses
- Use standard HTTP semantics
- Produce typed contracts

---

# File Organization Standards

One file should have one primary responsibility.

Large files should be decomposed before becoming difficult to navigate.

---

# Naming Conventions

Names should be:

- Descriptive
- Consistent
- Domain-oriented
- Singular where appropriate

Avoid abbreviations unless universally understood.

---

# Function Standards

Functions should:

- Do one thing
- Have descriptive names
- Minimize parameters
- Avoid hidden side effects
- Return predictable results

---

# Class Standards

Favor functions and composition.

Classes should be used only when they provide clear architectural value.

---

# Component Standards

Components should:

- Receive explicit props
- Avoid unnecessary state
- Avoid business logic
- Be reusable where appropriate

---

# Hook Standards

Custom hooks should:

- Encapsulate reusable behavior
- Avoid UI rendering
- Follow React hook conventions
- Return predictable interfaces

---

# Async Programming Standards

Async code should:

- Use async/await
- Handle cancellation where appropriate
- Avoid race conditions
- Preserve transaction integrity

---

# Logging Standards

Logs should:

- Be structured
- Avoid sensitive data
- Include correlation IDs
- Use appropriate severity

Logging should support diagnosis rather than debugging every implementation detail.

---

# Testing Standards

Every production feature should include:

- Unit tests
- Integration tests
- Security validation
- Accessibility verification where applicable

Critical financial workflows require end-to-end verification.

---

# Documentation Standards

Public APIs, reusable abstractions, and architectural decisions should be documented.

Documentation should remain synchronized with implementation.

---

# Code Comment Standards

Comments should explain:

- Why
- Constraints
- Tradeoffs

Avoid comments that merely repeat what the code already expresses.

---

# Dependency Standards

Dependencies should:

- Solve a meaningful problem
- Be maintained
- Be secure
- Be evaluated before adoption

Prefer standard library capabilities when appropriate.

---

# Refactoring Standards

Refactoring should:

- Preserve behavior
- Improve readability
- Reduce complexity
- Maintain test coverage
- Avoid unrelated changes

---

# Definition of Done

Code is complete when:

- Requirements satisfied
- Architecture preserved
- Tests passing
- Documentation updated
- Security reviewed
- Accessibility verified
- CI passing
- Ready for deployment

---

# Requirement Traceability

These standards support all implementation requirements by ensuring consistency, maintainability, security, reliability, and long-term scalability.

---

# Deferred Decisions

Deferred:

- ESLint configuration
- Prettier configuration
- TypeScript lint rules
- Import ordering automation
- Formatting automation
- Static analysis tooling
- Dependency scanning tooling
- IDE configuration
- AI-assisted coding guidelines

These implementation details may evolve independently of the architectural standards.

---

# Related Documents

- Engineering Principles
- Repository Standards
- Testing Architecture
- Observability Architecture
- Security Architecture
- Backend Architecture

---

# Revision History

| Version | Date | Summary |
|----------|------|---------|
| 1.0.0 | July 30, 2026 | Initial coding standards |
| 1.1.0 | August 2, 2026 | Documented the concrete Server Action framework (`src/lib/actions/`): `executeAction`, `requireActionUser`, `parseAction`, `assertAuthorized`, error classification and safe logging. Resolves the previously deferred "Server Action error-return conventions" and "Final error-class implementation" decisions for this boundary. |