# Mission Engine Specification

**Project:** Financial Operating System

**Internal Codename:** Athena

**Document Version:** 1.0.0

**Status:** Draft

**Owner:** Caitlin Gillum

**Primary Architect:** Caitlin Gillum

**Technical Advisor:** OpenAI ChatGPT

**Last Updated:** July 31, 2026

---

> **V1 Implementation Scope (2026-08-08):** Mission Engine V1 implements a
> non-gamified, deterministic subset of this document — 6 mission types, a
> 4-state lifecycle (`available`/`active`/`completed`/`archived`), and no
> XP, levels, streaks, badges, celebrations, rewards, shared missions, or
> mission recommendations. This document remains the aspirational product
> vision; see
> [`docs/adr/0006-mission-engine-v1-scope.md`](../adr/0006-mission-engine-v1-scope.md)
> for what was actually built, why, and what remains deferred.

---

# Table of Contents

1. Purpose
2. Mission
3. Product Philosophy
4. Mission Lifecycle
5. Mission Types
6. Mission Categories
7. Progress Engine
8. Rewards
9. Milestones
10. Celebrations
11. Shared Missions
12. Confidence Integration
13. Mission Recommendations
14. Dashboard Experience
15. Future Roadmap
16. Non-Goals
17. Guiding Principle
18. Revision History

---

# Purpose

The Athena Mission Engine transforms financial insight into meaningful action.

Rather than presenting financial goals as static numbers or checklist items, the Mission Engine creates personalized missions that motivate users through measurable progress, meaningful rewards, and continuous positive reinforcement.

Its purpose is to help users build lasting financial confidence by making financial progress visible, motivating, and rewarding.

The Mission Engine powers:

- Financial Missions
- Progress Tracking
- Rewards
- Milestones
- Celebrations
- Confidence Improvements
- Future AI Coaching

The Confidence Engine identifies opportunities.

The Mission Engine helps users achieve them.

---

# Mission

Athena motivates users to improve their financial confidence through meaningful, personalized missions that transform long-term financial goals into achievable progress.

---

# Product Philosophy

The Mission Engine is built upon five core beliefs.

## Purpose over Pressure

People are more likely to succeed when they understand why a goal matters.

Every mission should clearly communicate its purpose and expected impact.

---

## Progress over Perfection

Success is built through consistent improvement.

Partial progress should always be recognized and celebrated.

---

## Motivation over Obligation

Users choose missions.

Athena recommends opportunities but never forces financial priorities.

---

## Personalization over Standardization

Financial goals differ between individuals and households.

The Mission Engine should adapt to each user's financial profile, life stage, and objectives.

---

## Achievement over Completion

Completing a mission should feel meaningful.

Every completed mission represents measurable improvement in financial confidence.

---

# Mission Lifecycle

Every mission progresses through a standard lifecycle.

| Status    | Description                                              |
| --------- | -------------------------------------------------------- |
| Suggested | Athena recommends a mission based on financial analysis. |
| Accepted  | User chooses to begin the mission.                       |
| Active    | Progress is actively tracked.                            |
| Paused    | Progress tracking is temporarily suspended.              |
| Completed | Mission objectives have been achieved.                   |
| Archived  | Mission is preserved for historical reference.           |

---

# Mission Types

The Mission Engine supports several categories of financial missions.

## Savings Missions

Examples:

- Build Emergency Fund
- Vacation Savings
- Home Down Payment
- College Savings

---

## Debt Missions

Examples:

- Pay Off Credit Card
- Eliminate Auto Loan
- Become Consumer Debt Free

---

## Investment Missions

Examples:

- Invest First $10,000
- Max Roth IRA
- Increase Monthly Investments

---

## Retirement Missions

Examples:

- Increase 401(k) Contributions
- Capture Full Employer Match
- Reach Retirement Savings Goal

---

## Lifestyle Missions

Examples:

- Reduce Dining Out
- Lower Monthly Expenses
- Build Sustainable Budget

---

## Custom Missions

Users may create personalized missions with custom goals and rewards.

---

# Mission Categories

Each mission includes:

- Title
- Description
- Purpose
- Target
- Current Progress
- Estimated Completion
- Confidence Impact
- Reward
- Priority
- Status

---

# Progress Engine

Mission progress should update automatically whenever financial activity affects mission completion.

Progress sources include:

- Bank transactions
- Account balances
- Investment activity
- Manual updates
- Future connected financial institutions

Progress should always be transparent and easy to understand.

---

# Rewards

Every mission may include a user-defined reward.

Rewards are intentionally personal rather than financial.

Examples:

- Weekend getaway
- New golf clubs
- Family vacation
- Concert tickets
- Nice dinner
- New laptop

Athena recommends celebrating financial success rather than immediately replacing one financial goal with another.

---

# Milestones

Long-term missions should include milestone achievements.

Example

Emergency Fund

- 25%
- 50%
- 75%
- 100%

Each milestone provides encouragement and updates the Financial Brief.

---

# Celebrations

Mission completion should be recognized through thoughtful celebrations.

Examples include:

- Completion animations
- Achievement badges
- Financial milestone cards
- Timeline entries
- Confidence Score updates

Celebrations should reinforce progress without becoming distracting or overly gamified.

---

# Shared Missions

Households may choose to create shared financial missions.

Examples:

- Save for Home
- Family Vacation
- College Fund
- Pay Off Mortgage

Shared missions allow multiple users to contribute toward a common financial objective.

Future versions may support customizable privacy settings for shared financial information.

---

# Confidence Integration

Every mission should estimate its impact on financial confidence.

Example

Mission

Build Six-Month Emergency Fund

Estimated Confidence Gain

+6

Confidence Projection

82 → 88

This connection reinforces why each mission matters.

---

# Mission Recommendations

Athena continuously evaluates financial opportunities and recommends the highest-impact missions.

Recommendations consider:

- Confidence Engine analysis
- Financial priorities
- User goals
- Life stage
- Mission history

Athena recommends missions but never assigns them.

Users remain in control of which missions they choose to pursue.

---

# Dashboard Experience

The dashboard presents a simplified view of active missions.

Each mission includes:

- Progress
- Estimated completion
- Confidence gain
- Reward

Selecting a mission opens the complete Mission Detail experience.

Mission Details include:

- Mission Brief
- Timeline
- Progress History
- Milestones
- Confidence Impact
- Forecast
- Reward
- Activity

---

# Future Roadmap

## Version 2

- Dynamic mission prioritization
- Recurring missions
- Mission templates
- Household mission management
- Smart milestone recommendations

## Version 3

- AI-generated missions
- Adaptive rewards
- Community challenges
- Seasonal financial programs
- Employer-sponsored financial wellness missions

---

# Non-Goals

The Mission Engine intentionally does **not** attempt to:

- Force financial decisions.
- Replace professional financial advice.
- Encourage unhealthy financial sacrifices.
- Gamify finances for the sake of engagement.
- Reward users for risky financial behavior.
- Compare one user's mission progress against another.

The Mission Engine exists to encourage sustainable financial progress through meaningful motivation.

---

# Guiding Principle

Every mission should answer one question:

> **Will completing this mission meaningfully increase the user's financial confidence?**

If the answer is no, it should not become a mission.

The Mission Engine transforms financial recommendations into purposeful action.

---

## Revision History

| Version | Date       | Author         | Summary                                                                                                                                                                                                                                                    |
| ------- | ---------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0.0   | 2026-07-31 | Caitlin Gillum | Established the Mission Engine product specification, defining Athena's mission philosophy, lifecycle, mission categories, progress engine, rewards, milestones, celebrations, confidence integration, dashboard experience, and long-term product vision. |
| 1.0.1   | 2026-08-08 | Caitlin Gillum | Added a V1 Implementation Scope note pointing to ADR-0006 — Mission Engine V1 implements a non-gamified, deterministic subset of this document; no content below was changed. |
