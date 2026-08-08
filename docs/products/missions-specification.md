# Missions Specification

**Project:** Financial Operating System

**Internal Codename:** Athena

**Document Version:** 1.0.0

**Status:** Draft

**Owner:** Caitlin Gillum

**Primary Architect:** Caitlin Gillum

**Technical Advisor:** OpenAI ChatGPT

**Last Updated:** August 03, 2026

---

> **V1 Implementation Scope (2026-08-08):** Mission Engine V1 implements a
> non-gamified, deterministic subset of this document — 6 mission types
> (stay within budget, fund an emergency fund, reach a savings goal,
> categorize transactions, reduce debt, improve confidence), a 4-state
> lifecycle (`available`/`active`/`completed`/`archived`, §6 below is
> aspirational), and none of §19 Product Decisions' Experience Points,
> Levels, Theme Unlocks, Household Missions, or Custom Missions. See
> [`docs/adr/0006-mission-engine-v1-scope.md`](../adr/0006-mission-engine-v1-scope.md)
> for the full rationale and what remains deferred.

---

# Table of Contents

1. Purpose
2. Product Philosophy
3. Core Principles
4. Mission Types
5. Mission Structure
6. Mission Lifecycle
7. Eligibility
8. Progress Tracking
9. Completion Rules
10. Rewards
11. Streaks and Consistency
12. Mission Difficulty
13. User Experience Rules
14. Relationship to Goals
15. Relationship to the Confidence Engine
16. Recommendations and Personalization
17. Safety and Trust
18. Future Enhancements
19. Open Questions
20. Revision History

---

# 1. Purpose

The Missions system turns financial improvement into clear, achievable actions.

Missions help users move from understanding their finances to improving them.

They are designed to answer:

> What is the most useful financial action I can take next?

Missions should reduce uncertainty, build momentum, and reinforce healthy financial habits without creating pressure, shame, or artificial urgency.

---

# 2. Product Philosophy

Missions are not chores.

Missions are guided opportunities for progress.

Athena should use missions to make financial improvement feel:

- Clear
- Achievable
- Motivating
- Personal
- Supportive
- Measurable

A mission should always have a meaningful financial purpose.

Athena must never create missions solely to increase engagement.

---

# 3. Core Principles

## Progress Over Perfection

Missions should reward meaningful improvement rather than flawless behavior.

## Actionable

Every mission must include a clear action the user can understand and complete.

## Explainable

Athena must explain:

- Why the mission was recommended
- What completing it will improve
- How progress is measured
- What reward is earned

## Truthful

Mission progress must come from real user actions or verified financial data.

Athena must never fabricate completion, streaks, rewards, or progress.

## Personalized

Missions should reflect the user’s real financial situation, goals, priorities, and confidence gaps.

## Optional

Users may dismiss, postpone, or decline missions without punishment.

Missions must not feel coercive.

---

# 4. Mission Types

Athena may support several mission categories.

## Awareness Missions

Help users understand their finances.

Examples:

- Review uncategorized transactions
- Confirm current account balances
- Review recurring expenses
- Check recent spending

## Habit Missions

Encourage consistent financial behavior.

Examples:

- Review transactions for seven days
- Stay within a category target
- Make a planned savings contribution
- Complete a weekly financial check-in

## Goal Missions

Support progress toward financial goals.

Examples:

- Allocate money to an emergency fund
- Complete the next goal milestone
- Increase a monthly goal contribution
- Review goal funding sources

## Debt Missions

Support debt reduction.

Examples:

- Make an extra debt payment
- Review interest rates
- Create a payoff plan
- Pay down a specific balance threshold

## Savings Missions

Encourage increased savings and liquidity.

Examples:

- Save the first $500
- Build one month of expenses
- Allocate unassigned savings
- Create a sinking fund

## Organization Missions

Improve data quality and financial organization.

Examples:

- Categorize transactions
- Add a missing account
- Review duplicate records
- Archive an unused account

## Education Missions

Help users build financial knowledge.

Examples:

- Learn how credit utilization works
- Review emergency-fund guidance
- Understand account liquidity
- Compare debt-payoff methods

## Milestone Missions

Recognize meaningful accomplishments.

Examples:

- Complete the first goal
- Reach a savings milestone
- Maintain a positive cash flow streak
- Reduce debt below a threshold

## Custom Missions

Users may eventually create personal missions that Athena tracks without presenting them as system-generated recommendations.

---

# 5. Mission Structure

Each mission should contain:

- Mission ID
- Owner ID
- Title
- Description
- Mission type
- Purpose
- Eligibility criteria
- Progress target
- Current progress
- Completion criteria
- Difficulty
- Priority
- Status
- Start date
- Optional due date
- Completion date
- Reward
- Explanation
- Related goal, account, transaction set, or confidence dimension
- Created timestamp
- Updated timestamp

Mission records must remain owner-scoped.

---

# 6. Mission Lifecycle

Each mission exists in one of the following states.

| State     | Description                                             |
| --------- | ------------------------------------------------------- |
| Suggested | Athena has identified the mission as potentially useful |
| Available | The mission may be started                              |
| Active    | The user has accepted or begun the mission              |
| Completed | Completion criteria were verified                       |
| Dismissed | The user declined the mission                           |
| Expired   | A time-bound mission ended before completion            |
| Archived  | The mission is preserved but hidden from normal views   |

A dismissed mission may be suggested again only when circumstances materially change.

---

# 7. Eligibility

A mission should only appear when its eligibility conditions are satisfied.

Examples:

- A transaction-review mission requires uncategorized transactions.
- An emergency-fund mission requires an active emergency-fund goal or a detected savings need.
- A debt mission requires a supported liability.
- A spending mission requires sufficient transaction history.
- A streak mission requires a trackable recurring behavior.

Athena must not recommend missions based on missing, stale, or unsupported data without clearly disclosing the limitation.

---

# 8. Progress Tracking

Mission progress must be deterministic and explainable.

Progress may be based on:

- Verified account changes
- Goal allocations
- Completed contributions
- Transaction review actions
- Categorization actions
- Budget performance
- Debt balance changes
- Completed educational steps
- User-confirmed actions where automated verification is impossible

Progress should not be inferred from unrelated activity.

Example:

A normal transfer into savings should not automatically count toward a specific goal mission unless the funds are allocated to that goal.

---

# 9. Completion Rules

A mission is completed only when its documented completion criteria are satisfied.

Completion criteria may be:

## Binary

Example:

- Review all uncategorized transactions.

## Numeric

Example:

- Allocate $500 to an emergency fund.

## Percentage-Based

Example:

- Reach 50% of a goal milestone.

## Time-Based

Example:

- Complete a financial review once per week for four weeks.

## Multi-Step

Example:

1. Create a goal.
2. Select a funding source.
3. Make the first allocation.

Mission completion must be idempotent.

A mission must not grant duplicate completion rewards.

---

# 10. Rewards

Rewards should reinforce progress without encouraging unhealthy financial behavior.

Potential rewards include:

- Experience points
- Progress badges
- Theme unlocks
- Dashboard cosmetics
- Milestone celebrations
- Mission streak recognition
- Confidence explanations
- New educational content
- New mission categories

Rewards should primarily be:

- Cosmetic
- Educational
- Motivational
- Reflective of progress

Athena should not initially use:

- Cash rewards
- Gambling mechanics
- Loot boxes
- Paid mission boosts
- Artificial scarcity
- Loss-based streak pressure

## Reward Principles

Rewards must:

- Be transparent
- Be earned through real progress
- Avoid manipulation
- Avoid financial risk
- Never encourage unnecessary spending
- Never reduce a user’s financial confidence score as punishment

---

# 11. Streaks and Consistency

Streaks may recognize consistent healthy behavior.

Examples:

- Weekly review streak
- Monthly savings streak
- Transaction-review streak
- Goal-contribution streak

Streaks should be forgiving.

Athena should consider:

- Grace periods
- Pause options
- Recovery rules
- Longer-term consistency over perfect daily activity

Breaking a streak should not shame the user or erase all progress.

Athena should communicate:

> You paused your streak. Your progress still counts.

---

# 12. Mission Difficulty

Mission difficulty may be classified as:

- Quick Win
- Easy
- Moderate
- Challenging
- Milestone

Difficulty should reflect:

- Number of steps
- Required time
- Required financial commitment
- Behavioral complexity
- Data requirements

Difficulty must not be based solely on dollar amount because the same amount has different significance for different users.

---

# 13. User Experience Rules

Every mission should clearly show:

- What to do
- Why it matters
- Current progress
- Completion criteria
- Reward
- Related financial impact
- Whether the mission is optional
- Whether Athena can verify completion automatically

Users should be able to:

- Start a mission
- Pause a mission where appropriate
- Dismiss a mission
- View progress
- View completion history
- Understand the recommendation
- Review related financial data
- Control mission notifications

Mission copy should remain supportive and direct.

Avoid:

- Shame
- Fear
- Aggressive urgency
- Competitive pressure
- Manipulative countdowns
- Language implying moral failure

---

# 14. Relationship to Goals

Goals define desired financial outcomes.

Missions define actions that help achieve those outcomes.

Example:

```text
Goal:
Build a $10,000 emergency fund

Mission:
Allocate the first $500

Mission:
Set a recurring $200 monthly contribution

Mission:
Reach the one-month-expenses milestone
```

A goal may generate multiple missions over time.

A mission may contribute to one goal, several related goals, or no goal at all.

Mission completion must not directly alter goal progress unless the underlying verified action also changes the goal allocation or contribution ledger.

---

# 15. Relationship to the Confidence Engine

Missions may support specific Confidence Engine dimensions.

Examples:

- Emergency fund mission → Preparedness
- Transaction review mission → Awareness
- Budget review mission → Control
- Debt reduction mission → Resilience
- Goal contribution mission → Progress
- Account verification mission → Data Quality

Mission completion may contribute evidence to a confidence dimension.

However:

- Rewards must not artificially inflate the Confidence Score.
- Confidence changes must come from real financial evidence.
- Mission completion alone is not sufficient unless the completed action materially changes the user’s financial state or behavior.

The Confidence Engine and Mission Engine must remain separate systems.

Missions encourage action.

Confidence evaluates financial readiness.

---

# 16. Recommendations and Personalization

Mission recommendations may consider:

- Active goals
- Financial confidence dimensions
- Account balances
- Transaction patterns
- Budget performance
- Debt balances
- Recent activity
- User priorities
- Mission history
- Dismissed missions
- Available liquidity
- Target dates
- Data quality

Athena should prioritize missions that are:

1. High impact
2. Achievable
3. Timely
4. Relevant
5. Explainable

Users should not be overwhelmed with too many missions.

The system should prefer a small number of clear next actions over a large mission backlog.

---

# 17. Safety and Trust

Athena must never create a mission that encourages users to:

- Spend unnecessarily
- Take on avoidable debt
- Move emergency savings into illiquid assets without clear context
- Make investment decisions without appropriate disclosures
- Ignore essential expenses
- Miss required payments
- Sacrifice financial stability for a reward
- Share sensitive information unnecessarily

Mission recommendations must respect:

- Cash-flow constraints
- Emergency reserves
- Required expenses
- User-defined priorities
- Financial uncertainty
- Data confidence

When Athena lacks enough information, it should say so.

---

# 18. Future Enhancements

Future capabilities may include:

- Mission chains
- Personalized mission plans
- Household missions
- Partner collaboration
- Child-focused savings missions
- Seasonal missions
- Goal-linked mission sequences
- Mission templates
- User-created missions
- Smart reminders
- Confidence-based mission recommendations
- Adaptive difficulty
- Theme and cosmetic unlocks
- Mission history and impact summaries
- Annual financial campaigns
- Community challenges with privacy protections
- Financial education pathways

---

# 19. Product Decisions

## Experience Points

Athena will use a universal experience-points system in Version 1.

Users may earn XP by completing missions and maintaining healthy financial habits.

XP rewards should support a high degree of personalization.

Athena should provide:

- A library of established reward options
- Custom reward creation
- Rewards tailored to personal habits, hobbies, interests, and personality
- User-selected rewards for system-suggested missions
- User-defined rewards for custom missions

Missions may be:

- Suggested by Athena
- Selected from an available mission library
- Created fully by the user

Custom missions may include user-defined:

- Titles
- Descriptions
- Completion criteria
- XP values
- Rewards
- Related goals
- Tracking methods

XP should motivate progress without replacing financial outcomes or encouraging artificial engagement.

---

## Levels

Athena will use visible user levels.

Levels will be based primarily on accumulated XP and should provide a clear sense of long-term progress.

Levels may unlock:

- Profile recognition
- Badges
- Cosmetic rewards
- New mission options
- Educational content
- Additional personalization features

Levels must not imply financial status, intelligence, or personal worth.

---

## Theme Unlocks

Athena will provide a set of base themes available to all users.

Special, premium-style, or luxury themes may be unlocked through sustained usage streaks.

Theme unlocks should be tied to consistent engagement, such as:

- Daily check-ins
- Financial review streaks
- Continuous active usage
- Long-term consistency milestones

Themes should not primarily be unlocked through individual missions because missions are user-selected and highly customizable.

Mission completion and streak progression must remain separate reward systems.

---

## Mission Expiration

Missions will remain available until they are:

- Completed
- Dismissed by the user
- Archived by the user
- Invalidated because the underlying financial condition no longer exists

Missions will not expire solely because time has passed unless a future mission type is explicitly designed as time-sensitive.

Athena should avoid countdown pressure and artificial urgency.

---

## Custom Missions

Fully customizable missions will be supported in the first backend version.

Users may choose between:

- Athena-suggested missions
- Missions from a predefined library
- Fully custom missions

Custom missions should allow the user to define:

- Mission name
- Description
- Completion criteria
- Progress target
- Reward
- XP value within supported limits
- Related goal
- Frequency
- Tracking method
- Optional reminders

Athena should clearly distinguish between:

- Automatically verified missions
- User-confirmed missions
- Partially verified missions

---

## Household Missions

Household missions may include multiple participating users.

Each user may contribute independently toward the shared mission objective.

Household mission progress should show:

- Overall progress
- Individual contributions
- Participating members
- Completion criteria
- Shared reward
- Optional individual rewards

Household progress must remain owner-scoped and permission-aware.

No household member should gain access to another member’s unrelated financial information.

---

## Reward Reversal

Once a mission is completed and verified, it remains completed.

Mission completion, XP, level progress, and earned rewards will not be reversed if the user’s financial situation later changes.

Athena may create a new mission or recommendation when a financial state materially declines, but it must not erase prior progress.

Past accomplishments remain part of the user’s history.

---

## Repeatable Missions

Repeatable mission rules remain provisional for Version 1.

Initial support may include a limited set of clearly repeatable missions, such as:

- Daily financial check-in
- Weekly transaction review
- Monthly goal contribution
- Monthly budget review
- Recurring savings action

Repeat frequency should be explicitly defined per mission.

Possible frequencies include:

- Daily
- Weekly
- Monthly
- Per pay period
- Custom interval

The repeatable mission library should evolve based on real usage, completion patterns, and user feedback.

Custom missions may support repetition where the tracking method can reliably determine each completion cycle.

---

## Mission Limits

Version 1 will use a provisional limit of five active missions per user.

This limit is intended to:

- Reduce cognitive overload
- Keep the mission workspace focused
- Encourage completion before accumulation
- Preserve the value of each active mission

Users may maintain additional missions in:

- Suggested
- Available
- Paused
- Archived
- Completed

The five-mission limit should be configurable in the future if usage data shows that a different default is more effective.

Household missions may count separately from individual missions if product testing supports that distinction.

---

## Confidence Integration

Mission behavior should have limited direct influence on the Confidence Score.

Direct financial evidence remains the primary basis for confidence calculations.

Mission completion may influence confidence only when it produces verified evidence of a healthier financial state or sustained healthy behavior.

Examples include:

- Building an emergency fund
- Consistently reviewing transactions
- Reducing debt
- Maintaining positive cash flow
- Completing verified savings contributions
- Improving financial-data quality

The following should not independently increase confidence:

- Earning XP
- Reaching a level
- Unlocking a theme
- Completing a cosmetic mission
- Manually confirming an unverifiable action

The Confidence Engine remains authoritative for confidence calculations.

The Missions system may contribute evidence but must not independently define confidence.

Refer to the Confidence Engine specification for formulas, weighting, dimensions, and confidence-calculation rules.

---

# 20. Revision History

| Version | Date       | Author         | Summary                                                                                                                                                                                                                                                                                                                           |
| ------- | ---------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0.0   | 2026-08-03 | Caitlin Gillum | Established the Missions product specification, defining mission philosophy, types, lifecycle, eligibility, progress tracking, completion rules, rewards, streaks, difficulty, user experience, relationships to Goals and the Confidence Engine, personalization, safety principles, future roadmap, and open product decisions. |
| 1.0.1   | 2026-08-08 | Caitlin Gillum | Added a V1 Implementation Scope note pointing to ADR-0006 — Mission Engine V1 implements a non-gamified, deterministic subset of this document; no content below was changed. |
