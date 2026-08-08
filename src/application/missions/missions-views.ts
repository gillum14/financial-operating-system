import type { MissionRewardKey } from "@/domains/mission-progression/types";
import type { MissionStatus, MissionType } from "@/domains/missions/types";

// Presentation-shaped view model for the Missions workspace, kept outside
// src/composition/ (server-only) so "use client" components can import
// this *type* without pulling in a composition-root module — same pattern
// as Transactions/Accounts/Budgets/Goals/Reports.
//
// hasMissions/candidates/active/completed come from MissionService, which
// is itself backed entirely by the real Goals/Budgets/Accounts/
// Transactions/Confidence domains. xpLabel/progression come from the
// separate Mission Progression System (MissionProgressionService) —
// XP/level/streak/rewards, structurally isolated from Confidence (see
// progression-service.ts's module comment).
export interface MissionRow {
  id: string;
  missionType: MissionType;
  title: string;
  description: string;
  status: MissionStatus;
  currentValueLabel: string;
  targetValueLabel: string;
  completionPercent: number;
  isComplete: boolean;
  explanation: string;
  relatedPillarLabel: string | null;
  startedAtLabel: string;
  completedAtLabel: string | null;
  // True only for an active, missionType "custom" mission — the one case
  // where a "mark complete" action is legitimate (see MissionService.
  // completeCustomMission). Every other mission type completes only
  // through real-data evaluation, never a manual click.
  canMarkComplete: boolean;
  // e.g. "+200 XP" or "+125 XP" (base + the Daily Mission bonus) — the
  // mission's own locked xpValue plus the +25 bonus if isDailyMission,
  // formatted once here so every card renders it identically.
  xpLabel: string;
}

export interface MissionCandidateRow {
  missionType: MissionType;
  title: string;
  description: string;
  completionPercent: number;
  explanation: string;
  relatedPillarLabel: string | null;
  xpLabel: string;
  // Exactly one of these is set — the exact id startMission needs to
  // re-identify this same candidate server-side.
  relatedGoalId?: string;
  relatedAccountId?: string;
  relatedBudgetPeriodId?: string;
}

export interface MissionRewardRow {
  key: MissionRewardKey;
  title: string;
  description: string;
  unlockedAtLabel: string;
}

export interface LockedMissionRewardRow {
  key: MissionRewardKey;
  title: string;
  description: string;
  // e.g. "3 of 5 missions completed" or "Level 2 of 5" — the same
  // progression numbers already on MissionProgressionView, run through
  // the reward's own canonical progress formula (see
  // progression-calculations.ts's computeRewardProgress). Never
  // recomputed independently in a component.
  progressLabel: string;
  progressPercent: number;
}

// The Missions page's 4 real summary tiles — Total Points (totalXp),
// Level, Current Streak, and Rewards Earned (unlockedRewards.length) all
// read directly from here, replacing the honest "—" placeholders that
// stood in for this exact shape before the Mission Progression System
// existed.
export interface MissionProgressionView {
  totalXp: number;
  level: number;
  // e.g. "450 / 1,000 XP" — progress toward the next level.
  xpIntoLevelLabel: string;
  currentStreak: number;
  longestStreak: number;
  unlockedRewards: MissionRewardRow[];
  // The remaining initial rewards not yet unlocked, each carrying its own
  // progress-toward-unlocking (no unlock date, since there isn't one
  // yet) — used by both UpcomingRewardsCard's short list and the full
  // Rewards tab grid.
  lockedRewards: LockedMissionRewardRow[];
}

// The three kinds of activity the History tab shows — deliberately not
// a separate "XP earned" kind: every mission completion carries exactly
// one XP award (see MissionProgressionService.recordMissionCompletion's
// unique-per-mission XP event), so folding the XP into the completion
// entry's own detail line is the real event, not two events for one
// thing. "level-up" is the one kind with no row of its own anywhere —
// see missions-query.ts's buildHistoryEvents for how it's derived, never
// stored.
export type MissionHistoryEventKind = "mission-completed" | "reward-unlocked" | "level-up";

export interface MissionHistoryEventRow {
  id: string;
  kind: MissionHistoryEventKind;
  // e.g. 'Completed "Categorize Your Transactions"' / 'Unlocked "Momentum"' / "Reached Level 2".
  title: string;
  // e.g. "+50 XP", a reward's own description, or a running XP total for
  // a level-up — null when a kind has nothing further to say.
  detail: string | null;
  // e.g. "2:14 PM" — the date itself is the enclosing group's dateLabel,
  // never repeated per-event.
  timeLabel: string;
}

// One calendar day's worth of activity, newest day first (and newest
// event first within the day) — the grouping this system uses instead of
// a flat, repetitive list, per "group repeated events cleanly."
export interface MissionHistoryDayGroup {
  dateLabel: string;
  events: MissionHistoryEventRow[];
}

// Aggregated entirely from the owner's own completed missions' own real,
// recorded start/current values (see missions-query.ts's
// computeImpactSummary) — never a re-attribution of unrelated Transactions/
// Goals activity. This is the honest version of what the original
// pre-Mission-Engine placeholder card explicitly refused to fabricate.
export interface MissionImpactSummary {
  completedCount: number;
  totalDebtPaidOffLabel: string;
  totalGoalsFundedLabel: string;
}

export interface MissionsOverviewView {
  hasMissions: boolean;
  candidates: MissionCandidateRow[];
  // The first ~3 candidates, for the main page's shortened list — same
  // deterministic order as `candidates`, never a separate ranking.
  topCandidates: MissionCandidateRow[];
  active: MissionRow[];
  completed: MissionRow[];
  archived: MissionRow[];
  impactSummary: MissionImpactSummary;
  progression: MissionProgressionView;
  history: MissionHistoryDayGroup[];
}
