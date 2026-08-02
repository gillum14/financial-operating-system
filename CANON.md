# Athena Canon

**Project:** Financial Operating System  
**Internal Codename:** Athena  
**Document Version:** 1.0.0  
**Status:** Approved  
**Owner:** Caitlin Gillum  
**Maintainer:** Technical Lead  
**Effective Date:** August 1, 2026  
**Last Updated:** August 1, 2026

---

## Purpose

The Athena Canon is the authoritative source of truth for the product.

Its purpose is to preserve product decisions, engineering intent, architectural direction, and implementation state so future work builds on established decisions rather than rediscovering them.

If a future proposal conflicts with the Canon, the conflict must be identified and resolved before implementation.

---

## Guiding Principles

### Security First

Security is never deferred. It is designed into every layer of Athena rather than added afterward.

### Explainability

Athena never presents financial conclusions without being able to explain how they were reached.

Every recommendation, confidence calculation, mission, and insight must be explainable.

### User Trust

Athena must always be worthy of user trust.

The application must never:

- shame users;
- manipulate users;
- fabricate urgency;
- exaggerate certainty;
- hide material assumptions.

### Financial Confidence

Athena's purpose is not merely budgeting. Athena's purpose is increasing financial confidence.

Every major product decision should ultimately support the question:

> Am I more financially prepared today than I was yesterday?

### User Ownership

Users own their financial data. Athena protects, organizes, and analyzes it on their behalf.

### Deterministic Before Intelligent

Authoritative financial calculations must be deterministic.

Artificial intelligence may enhance language, explanation, and presentation, but it must never replace authoritative financial calculations or silently make binding financial decisions.

---

## Product State

| System | Specification | Implementation | Production Status |
|---|---|---|---|
| Product Requirements | Complete | Foundational work implemented | Not production-ready |
| Architecture | Complete | Partially implemented | Not production-ready |
| Authentication | Complete | Implemented in development | Development verification |
| Row Level Security | Complete | Implemented in development | Development verification |
| Dashboard | Complete | Partially live; some sections remain mocked | Development |
| Confidence Engine | Complete | Not yet implemented | Not production-ready |
| Mission Engine | Complete | Not yet implemented | Not production-ready |
| Recommendation Engine | Complete | Not yet implemented | Not production-ready |
| Financial Brief | Complete | Partially mocked | Not production-ready |
| Plaid Integration | Planned | Not implemented | Not production-ready |
| Mobile Application | Planned | Not implemented | Not production-ready |

Implementation state must be updated when significant work is merged. Detailed implementation status remains in GitHub issues, pull requests, and repository documentation.

---

## Product Philosophy

Athena exists to reduce financial stress and help individuals and households build durable financial confidence.

Success is measured by meaningful user progress, not compulsive engagement.

Athena should encourage strong financial habits through:

- transparency;
- education;
- achievable progress;
- supportive language;
- clear next actions;
- honest representation of uncertainty.

---

## Engineering Philosophy

Athena follows these engineering rules:

- Architecture precedes implementation.
- Security precedes convenience.
- Authentication, authorization, and ownership remain distinct concepts.
- Tests accompany features.
- Documentation evolves with the product.
- Technical debt is tracked intentionally.
- Financial calculations are deterministic and explainable.
- No feature is complete until its testing, security, and documentation requirements are satisfied.
- Unknown or invalid security states fail closed.
- Browser-controlled identity and ownership values are never trusted.

---

## Repository Boundaries

### Public Repository

The public repository may contain:

- source code;
- product and architecture documentation;
- engineering standards;
- public roadmap information;
- testing strategy;
- general security philosophy;
- non-sensitive security architecture principles.

### Private Repository

A future private repository will contain security-sensitive and operational material, including:

- production infrastructure and topology;
- detailed threat models and attack scenarios;
- incident-response procedures;
- operational runbooks;
- secret-management and key-rotation procedures;
- Plaid token and webhook implementation details;
- production monitoring and alert configuration;
- privileged administrative procedures.

The private repository must be established before Plaid implementation or production operational documentation begins.

---

## Living Decision Register

The Canon records governing product and engineering decisions at a high level.

Detailed technical rationale belongs in Architecture Decision Records and, once established, private Security Architecture Decision Records.

A decision becomes canonical only when it is:

1. written;
2. approved by the product owner;
3. version-controlled;
4. maintained as the product evolves.

Conversational memory alone is never authoritative.

---

## Maintenance Rules

The Canon must be reviewed whenever:

- a core product philosophy changes;
- a defining feature is specified or materially redesigned;
- architecture materially changes;
- security posture changes;
- a major implementation milestone is merged;
- public/private documentation boundaries change;
- a decision conflicts with an existing canonical rule.

Every significant pull request should include a Canon check:

- Does this change product philosophy?
- Does this change engineering philosophy?
- Does this change security posture?
- Does this introduce or retire material technical debt?
- Does this materially change implementation state?

If the answer to any question is yes, a Canon revision should be proposed.

---

## Success Criteria

The Athena Canon should allow a new contributor to understand:

- what Athena is;
- why Athena exists;
- how Athena makes product and engineering decisions;
- which principles are non-negotiable;
- what has already been decided;
- what remains to be implemented;
- where authoritative detail is documented.

The Canon does not replace specifications, ADRs, source code, tests, or the engineering backlog. It governs how those sources relate and which decisions are authoritative.

---

## Revision History

| Version | Date | Author | Summary |
|---|---|---|---|
| 1.0.0 | 2026-08-01 | Caitlin Gillum | Established the approved Athena Canon and governing product, engineering, security, and documentation principles. |
