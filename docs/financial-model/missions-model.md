# Missions Model

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
4. Mission Types
5. Mission Lifecycle
6. Mission Sources
7. Mission Verification
8. Progress Tracking
9. Experience Points
10. Levels
11. Rewards
12. Streaks and Theme Unlocks
13. Repeatable Missions
14. Mission Limits
15. Household Missions
16. Relationship to Goals
17. Relationship to the Confidence Engine
18. Completion and Reward Finality
19. Safety and Validation Rules
20. Future Enhancements
21. Revision History

---

# 1. Purpose

The Missions system transforms financial improvement into clear, achievable actions.

Missions help users move from passive financial awareness to intentional progress.

The system is designed to answer:

> What useful action can I take next?

Missions may be suggested by Athena, selected from a mission library, or created entirely by the user.

---

# 2. Design Philosophy

Missions should make financial progress feel:

- Clear
- Personal
- Achievable
- Flexible
- Motivating
- Supportive

Missions are not intended to create artificial engagement.

Every mission should either:

- Improve financial understanding
- Support a financial goal
- Strengthen a healthy financial habit
- Improve financial organization
- Recognize meaningful progress

Users retain control over which missions they accept, create, dismiss, or complete.

---

# 3. Core Entities

The Missions system is expected to include the following core concepts.

## Mission

Represents a defined action, habit, milestone, or objective.

A mission may contain:

- Mission ID
- Owner ID
- Title
- Description
- Mission type
- Mission source
- Status
- Difficulty
- Priority
- Progress target
- Current progress
- Tracking method
- Verification method
- XP reward
- User-defined reward
- Related goal
- Related account
- Related confidence dimension
- Start date
- Optional recurrence
- Completion date
- Created timestamp
- Updated timestamp

## Mission Progress

Represents measurable advancement toward mission completion.

Progress may be:

- Binary
- Numeric
- Percentage-based
- Time-based
- Multi-step
- User-confirmed

## Mission Reward

Represents the reward selected or earned through mission completion.

Rewards may include:

- XP
- Personal rewards
- Badges
- Cosmetic recognition
- Educational content
- Profile achievements

## Mission Participant

Represents a user contributing to a shared household mission.

## Mission Completion

Represents the verified and permanent completion event for a mission.

Completion records should be auditable and idempotent.

---

# 4. Mission Types

Athena may support the following mission types.

## Awareness

Examples:

- Review recent transactions
- Confirm account balances
- Review recurring expenses

## Habit

Examples:

- Complete a weekly financial review
- Maintain a savings habit
- Review transactions consistently

## Goal

Examples:

- Allocate the first $500 to a goal
- Reach a goal milestone
- Make a planned contribution

## Savings

Examples:

- Build an initial emergency reserve
- Allocate unassigned savings
- Create a sinking fund

## Debt

Examples:

- Make an extra payment
- Review debt balances
- Complete a payoff milestone

## Organization

Examples:

- Categorize transactions
- Add a missing account
- Archive an unused account

## Education

Examples:

- Complete a financial learning module
- Review an Athena explanation
- Learn a specific financial concept

## Milestone

Examples:

- Complete a first goal
- Reach a savings threshold
- Reduce debt below a target

## Custom

Created entirely by the user.

Custom missions may include user-defined:

- Titles
- Completion criteria
- XP values within supported limits
- Rewards
- Tracking methods
- Frequencies
- Related goals

---

# 5. Mission Lifecycle

Each mission exists in one of the following states.

| State     | Description                                           |
| --------- | ----------------------------------------------------- |
| Suggested | Athena identified the mission as potentially useful   |
| Available | The mission may be selected                           |
| Active    | The mission has been started                          |
| Paused    | Progress is temporarily suspended                     |
| Completed | Completion criteria were satisfied                    |
| Dismissed | The user declined the mission                         |
| Archived  | The mission is preserved but hidden from normal views |

Missions generally remain available until completed, dismissed, or archived.

Missions do not expire solely because time has passed unless a future mission type explicitly requires a deadline.

---

# 6. Mission Sources

A mission may originate from one of three sources.

## Athena-Suggested

Generated or recommended based on:

- User goals
- Financial data
- Confidence dimensions
- Transaction patterns
- Budget performance
- Account status
- Prior mission behavior

## Mission Library

Selected by the user from a predefined collection.

## User-Created

Fully customized by the user.

The mission source should remain visible so users understand whether a mission was recommended, selected, or personally created.

---

# 7. Mission Verification

Mission verification should be classified explicitly.

## Automatically Verified

Completion can be confirmed from trusted Athena data.

Examples:

- A goal allocation reached a threshold
- All uncategorized transactions were reviewed
- A debt balance fell below a target

## User Confirmed

Athena cannot independently verify completion.

Examples:

- Completed a personal financial conversation
- Read educational content outside Athena
- Avoided an optional purchase

## Partially Verified

Athena can verify some but not all completion criteria.

Athena must clearly communicate the verification method.

User-confirmed missions should not receive disproportionate XP or materially affect financial confidence without supporting evidence.

---

# 8. Progress Tracking

Mission progress must be deterministic where possible.

Progress may be tracked through:

- Financial balances
- Goal allocations
- Contribution records
- Transaction actions
- Category review
- Budget activity
- Debt changes
- Streak events
- Completed steps
- User confirmation

Progress should never be inferred from unrelated activity.

A normal savings transfer must not count toward a goal mission unless the money is also allocated to that goal.

---

# 9. Experience Points

Athena will use a universal XP system in Version 1.

XP represents participation and progress within the Missions system.

XP may be earned through:

- Completing missions
- Maintaining supported habits
- Reaching milestones
- Completing verified educational actions
- Participating in household missions

XP must not represent:

- Net worth
- Financial intelligence
- Personal worth
- Financial readiness
- Confidence Score

## XP Rules

- Each mission has a defined XP reward.
- Custom mission XP must remain within supported limits.
- XP is awarded once per verified completion.
- Duplicate completion events must not award duplicate XP.
- XP is not revoked after completion.
- XP values may reflect difficulty and verification strength.
- Unverified missions should generally award less XP than automatically verified missions.

---

# 10. Levels

Athena will use visible user levels.

Levels are based primarily on accumulated XP.

Levels should provide a sense of long-term progress without implying financial superiority.

Levels may unlock:

- Profile badges
- Cosmetic recognition
- New mission templates
- Educational content
- Personalization options
- Additional mission features

Level names and thresholds should remain supportive and nonjudgmental.

---

# 11. Rewards

Missions may include both system-defined and user-defined rewards.

## System Rewards

Examples:

- XP
- Badges
- Achievement recognition
- Profile milestones
- Educational unlocks

## Personal Rewards

Users may define rewards that reflect their habits, hobbies, interests, and personality.

Examples:

- A movie night
- A favorite meal
- A new book
- A recreational activity
- Personal downtime
- A planned purchase within a safe amount

Athena should provide a library of reward ideas while allowing full customization.

Rewards must not encourage:

- Unnecessary debt
- Overspending
- Gambling behavior
- Financial self-sabotage
- Essential-expense neglect

---

# 12. Streaks and Theme Unlocks

Streaks are separate from missions.

Missions reward completed actions.

Streaks reward continuous usage and consistency.

Base themes will be available to all users.

Special or luxury themes may be unlocked through streak milestones.

Possible streak signals include:

- Daily Athena usage
- Daily financial check-ins
- Continuous review activity
- Sustained engagement over time

Theme unlocks should not depend primarily on mission completion because missions are user-selected and customizable.

## Streak Principles

- Streaks should be forgiving.
- Grace periods may be supported.
- A missed day should not erase all historical progress.
- Streak messaging must never shame the user.
- Earned theme unlocks should remain permanent.

---

# 13. Repeatable Missions

Repeatable mission behavior remains provisional for Version 1.

Initial repeatable missions may include:

- Daily financial check-in
- Weekly transaction review
- Monthly goal contribution
- Monthly budget review
- Recurring savings action

Potential recurrence options include:

- Daily
- Weekly
- Monthly
- Per pay period
- Custom interval

Each recurrence cycle should create a distinct completion event.

Repeatable mission rules should be refined using real usage data and user feedback.

---

# 14. Mission Limits

Version 1 will use a provisional limit of five active individual missions per user.

The limit exists to:

- Reduce cognitive overload
- Maintain focus
- Encourage completion
- Prevent mission accumulation
- Preserve the importance of each mission

Users may have additional missions in:

- Suggested
- Available
- Paused
- Completed
- Dismissed
- Archived

The active limit should remain configurable as the product evolves.

Household missions may be evaluated separately from the individual active-mission limit.

---

# 15. Household Missions

Household missions may include multiple participating users.

Each participant may contribute toward overall completion.

Household mission progress should support:

- Overall progress
- Individual contributions
- Participating members
- Shared completion criteria
- Shared rewards
- Optional individual rewards

Permissions must remain explicit.

Participation in a household mission must not expose unrelated financial data belonging to another household member.

---

# 16. Relationship to Goals

Goals define desired outcomes.

Missions define actions that support those outcomes.

### Example

```text
Goal:
Build a $10,000 emergency fund

Mission:
Allocate the first $500

Mission:
Schedule a monthly contribution

Mission:
Reach the one-month-expenses milestone
```

Mission completion does not automatically alter goal progress.

Goal progress changes only when the verified underlying action changes the goal allocation or contribution ledger.

---

# 17. Relationship to the Confidence Engine

Mission behavior should have limited direct influence on the Confidence Score.

Financial evidence remains the primary basis for confidence calculations.

Mission completion may contribute evidence when it produces:

- Improved savings
- Reduced debt
- Better financial-data quality
- Sustained transaction review
- Improved cash flow
- Verified goal progress
- Healthy repeated behavior

The following must not independently increase confidence:

- XP
- Levels
- Theme unlocks
- Cosmetic rewards
- Unverified mission completion
- Mission count

The Missions system encourages action.

The Confidence Engine evaluates financial readiness.

These systems must remain separate.

---

# 18. Completion and Reward Finality

Once a mission is completed and verified:

- The mission remains completed.
- XP remains awarded.
- Level progress remains.
- Earned rewards remain.
- Completion history remains preserved.

If the related financial state later reverses, Athena may:

- Create a new mission
- Generate a recommendation
- Update confidence evidence
- Notify the user of the changed condition

Athena must not erase prior accomplishments.

---

# 19. Safety and Validation Rules

The Missions system must enforce:

- Owner-scoped mission access
- Valid mission status transitions
- Positive XP values
- Supported XP limits for custom missions
- Idempotent completion
- No duplicate rewards
- Explicit verification methods
- Permission-aware household participation
- Safe reward guidance
- Clear distinction between system and custom missions

Athena must not create missions that encourage users to:

- Spend unnecessarily
- Take on avoidable debt
- Ignore essential expenses
- Sacrifice emergency reserves for cosmetic rewards
- Make unsupported investment decisions
- Share sensitive financial information unnecessarily
- Prioritize engagement over financial stability

---

# 20. Future Enhancements

Future capabilities may include:

- Mission chains
- Personalized mission plans
- Adaptive difficulty
- User-created mission templates
- Household mission administration
- Partner collaboration
- Child-focused missions
- Seasonal missions
- Mission recommendations
- Custom reminder schedules
- More advanced recurring missions
- XP balancing based on product usage
- Mission impact summaries
- Additional reward libraries
- Community challenges with privacy protections
- Confidence-linked recommendations
- Mission creation assistance from Athena AI

---

# 21. Revision History

| Version | Date       | Author         | Summary                                                                                                                                                                                                                                                                                                                                                                                              |
| ------- | ---------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0.0   | 2026-08-03 | Caitlin Gillum | Established the canonical Missions domain model, defining mission entities, lifecycle, sources, verification, progress tracking, universal XP, visible levels, personal rewards, streak-based theme unlocks, repeatable missions, provisional active-mission limits, household participation, relationships to Goals and the Confidence Engine, reward finality, safety rules, and future expansion. |
