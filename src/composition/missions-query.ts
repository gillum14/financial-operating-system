import "server-only";

import { MISSION_TYPE_PILLAR, type MissionProgress } from "@/application/missions/mission-calculations";
import type { MissionCandidate } from "@/application/missions/mission-eligibility";
import { DAILY_MISSION_BONUS_XP, computeMissionXpValue } from "@/application/missions/progression-calculations";
import type { MissionProgressionOverview, UnlockedMissionReward } from "@/application/missions/progression-service";
import type { MissionWithProgress } from "@/application/missions/service";
import type {
  LockedMissionRewardRow,
  MissionCandidateRow,
  MissionHistoryDayGroup,
  MissionHistoryEventKind,
  MissionImpactSummary,
  MissionProgressionView,
  MissionRewardRow,
  MissionRow,
  MissionsOverviewView,
} from "@/application/missions/missions-views";
import { PILLAR_LABELS } from "@/application/confidence/confidence-calculations";
import { computeLevel, computeRewardProgress, REWARD_DEFINITIONS } from "@/application/missions/progression-calculations";
import type { MissionRewardKey } from "@/domains/mission-progression/types";
import type { Mission, MissionType } from "@/domains/missions/types";

import { getMissionProgressionService, getMissionService } from "./missions-composition";

export type { MissionsOverviewView };

// Server-only query orchestration for the Missions workspace — same role
// as goals-query.ts/budgets-query.ts: combines MissionService reads into a
// presentation-ready view model. No JSX, no try/catch — errors propagate
// to the route's error boundary. All formatting/labeling lives here, not
// in MissionService, matching every other domain's query-layer split.

function relatedPillarLabel(missionType: MissionType): string | null {
  const pillar = MISSION_TYPE_PILLAR[missionType];
  return pillar ? PILLAR_LABELS[pillar] : null;
}

function formatMissionValue(missionType: MissionType, value: number): string {
  switch (missionType) {
    case "stay-within-budget":
      return `${Math.round(value)}%`;
    case "fund-emergency-fund":
    case "reach-savings-goal":
    case "reduce-debt":
      return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
    case "categorize-transactions":
      return `${Math.round(value)}`;
    case "improve-confidence":
      return `${Math.round(value)}`;
    case "custom":
      return "";
  }
}

function formatDateTimeLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function xpLabelFor(xpValue: number, isDailyMission: boolean): string {
  const total = xpValue + (isDailyMission ? DAILY_MISSION_BONUS_XP : 0);
  return `+${total.toLocaleString("en-US")} XP`;
}

function toMissionRow(mission: Mission, progress: MissionProgress): MissionRow {
  return {
    id: mission.id,
    missionType: mission.missionType,
    title: mission.title,
    description: mission.description,
    status: mission.status,
    currentValueLabel: formatMissionValue(mission.missionType, progress.currentValue),
    targetValueLabel: formatMissionValue(mission.missionType, progress.targetValue),
    completionPercent: Math.round(progress.percentComplete),
    isComplete: progress.isComplete,
    explanation: progress.explanation,
    relatedPillarLabel: relatedPillarLabel(mission.missionType),
    startedAtLabel: formatDateTimeLabel(mission.startedAt),
    completedAtLabel: mission.completedAt ? formatDateTimeLabel(mission.completedAt) : null,
    canMarkComplete: mission.missionType === "custom" && mission.status === "active",
    xpLabel: xpLabelFor(mission.xpValue, mission.isDailyMission),
  };
}

const TOP_CANDIDATES_COUNT = 3;

function currencyLabel(value: number): string {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

// Aggregated only from the owner's own completed missions' own real,
// live-recomputed progress — never a re-derivation from Transactions/Goals
// directly, and never counting a mission that isn't actually completed.
// startValue is read from the mission's own immutable start-time snapshot
// (captured once, at start); currentValue is the same live number the
// mission's own card shows.
function computeImpactSummary(missionsWithProgress: MissionWithProgress[]): MissionImpactSummary {
  let totalDebtPaidOff = 0;
  let totalGoalsFunded = 0;
  let completedCount = 0;

  for (const { mission, progress } of missionsWithProgress) {
    if (mission.status !== "completed") continue;
    completedCount += 1;

    if (mission.missionType === "reduce-debt") {
      totalDebtPaidOff += Math.max(0, Number(mission.startValue ?? 0) - progress.currentValue);
    } else if (mission.missionType === "fund-emergency-fund" || mission.missionType === "reach-savings-goal") {
      totalGoalsFunded += progress.currentValue;
    }
  }

  return {
    completedCount,
    totalDebtPaidOffLabel: currencyLabel(totalDebtPaidOff),
    totalGoalsFundedLabel: currencyLabel(totalGoalsFunded),
  };
}

function toCandidateRow(candidate: MissionCandidate): MissionCandidateRow {
  const { xpValue } = computeMissionXpValue(candidate.missionType);
  return {
    missionType: candidate.missionType,
    title: candidate.title,
    description: candidate.description,
    completionPercent: Math.round(candidate.preview.percentComplete),
    explanation: candidate.preview.explanation,
    relatedPillarLabel: relatedPillarLabel(candidate.missionType),
    xpLabel: xpLabelFor(xpValue, false),
    relatedGoalId: candidate.relatedGoalId,
    relatedAccountId: candidate.relatedAccountId,
    relatedBudgetPeriodId: candidate.relatedBudgetPeriodId,
  };
}

const REWARD_DEFINITION_BY_KEY = new Map(REWARD_DEFINITIONS.map((reward) => [reward.key, reward]));

function toRewardRow(key: MissionRewardKey, unlockedAt: Date): MissionRewardRow {
  const definition = REWARD_DEFINITION_BY_KEY.get(key);
  return {
    key,
    title: definition?.title ?? key,
    description: definition?.description ?? "",
    unlockedAtLabel: formatDateTimeLabel(unlockedAt),
  };
}

function toProgressionView(overview: MissionProgressionOverview): MissionProgressionView {
  // Newest-unlocked-first — real unlock timestamps from the immutable
  // mission_rewards ledger, never a fabricated "just now".
  const sortedRewards = [...overview.unlockedRewards].sort((a, b) => b.unlockedAt.getTime() - a.unlockedAt.getTime());
  const unlockedKeys = new Set(overview.unlockedRewards.map((reward) => reward.key));

  // hasCompletedMajorMilestone is always false here: it is never a
  // persisted running stat (only knowable at completion-time, see
  // MissionProgressionService.unlockEligibleRewards), and a still-LOCKED
  // reward could never have seen it be true — if it had, "major-win"
  // would already be unlocked and wouldn't reach this branch. False is
  // therefore correct by invariant for every reward computed below, not
  // a placeholder.
  const eligibilityStats = {
    completedMissionCount: overview.completedMissionCount,
    currentStreak: overview.currentStreak,
    level: overview.level,
    hasCompletedMajorMilestone: false,
  };
  const lockedRewards: LockedMissionRewardRow[] = REWARD_DEFINITIONS.filter(
    (definition) => !unlockedKeys.has(definition.key),
  ).map((definition) => {
    const progress = computeRewardProgress(definition, eligibilityStats);
    return {
      key: definition.key,
      title: definition.title,
      description: definition.description,
      progressLabel: progress.label,
      progressPercent: progress.percent,
    };
  });

  return {
    totalXp: overview.totalXp,
    level: overview.level,
    xpIntoLevelLabel: `${overview.xpIntoLevel.toLocaleString("en-US")} / ${overview.xpForNextLevel.toLocaleString("en-US")} XP`,
    currentStreak: overview.currentStreak,
    longestStreak: overview.longestStreak,
    unlockedRewards: sortedRewards.map((reward) => toRewardRow(reward.key, reward.unlockedAt)),
    lockedRewards,
  };
}

interface RawHistoryEvent {
  kind: MissionHistoryEventKind;
  id: string;
  timestamp: Date;
  title: string;
  detail: string | null;
}

function timeLabelFor(date: Date): string {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// The History tab's entire event log, built once here from data this
// query already has in hand — no new repository reads. Every event kind
// traces back to something already persisted (a mission's own
// completedAt, or the immutable mission_rewards unlock ledger) except
// level-ups, which have no row of their own anywhere: they're replayed
// from each completion's XP contribution through the same canonical
// computeLevel() progression-calculations.ts uses for the Level stat
// tile, never a second leveling formula. "Do not duplicate progression
// logic in the frontend" is satisfied the same way the Rewards tab
// satisfies it — all of this runs here, server-side; the component only
// renders the finished rows.
function buildHistoryEvents(missionsWithProgress: MissionWithProgress[], unlockedRewards: UnlockedMissionReward[]): MissionHistoryDayGroup[] {
  const events: RawHistoryEvent[] = [];

  // Oldest-first for now — needed below to replay level-ups in the order
  // they actually happened; re-sorted newest-first once every event kind
  // has been collected.
  const completedMissions = missionsWithProgress
    .map((entry) => entry.mission)
    .filter((mission): mission is Mission & { completedAt: Date } => mission.completedAt !== null)
    .sort((a, b) => a.completedAt.getTime() - b.completedAt.getTime());

  // One event per completion, XP included in its own detail line — a
  // completed mission and the XP it earned are the same real event (see
  // MissionProgressionService.recordMissionCompletion's exactly-once XP
  // event), never split into two feed entries for one thing.
  for (const mission of completedMissions) {
    events.push({
      kind: "mission-completed",
      id: `mission:${mission.id}`,
      timestamp: mission.completedAt,
      title: `Completed "${mission.title}"`,
      detail: xpLabelFor(mission.xpValue, mission.isDailyMission),
    });
  }

  for (const reward of unlockedRewards) {
    const definition = REWARD_DEFINITION_BY_KEY.get(reward.key);
    events.push({
      kind: "reward-unlocked",
      id: `reward:${reward.key}`,
      timestamp: reward.unlockedAt,
      title: `Unlocked "${definition?.title ?? reward.key}"`,
      detail: definition?.description ?? null,
    });
  }

  // Replays totalXp forward, one completion at a time, and emits a
  // level-up event for every level boundary that completion's XP
  // crossed — a while loop rather than a single if, since a single
  // completion crossing more than one level at once is possible in
  // principle (a future, larger XP value) even though no current
  // mission's XP is large enough to do that today.
  let cumulativeXp = 0;
  let currentLevel = computeLevel(0).level;
  for (const mission of completedMissions) {
    cumulativeXp += mission.xpValue + (mission.isDailyMission ? DAILY_MISSION_BONUS_XP : 0);
    const newLevel = computeLevel(cumulativeXp).level;
    while (currentLevel < newLevel) {
      currentLevel += 1;
      events.push({
        kind: "level-up",
        id: `level:${currentLevel}`,
        timestamp: mission.completedAt,
        title: `Reached Level ${currentLevel}`,
        detail: `${cumulativeXp.toLocaleString("en-US")} XP total`,
      });
    }
  }

  events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const groups: MissionHistoryDayGroup[] = [];
  let currentDayKey: string | null = null;
  let currentGroup: MissionHistoryDayGroup | null = null;

  for (const event of events) {
    const dayKey = event.timestamp.toISOString().slice(0, 10);
    if (dayKey !== currentDayKey) {
      currentDayKey = dayKey;
      currentGroup = { dateLabel: formatDateTimeLabel(event.timestamp), events: [] };
      groups.push(currentGroup);
    }
    currentGroup!.events.push({
      id: event.id,
      kind: event.kind,
      title: event.title,
      detail: event.detail,
      timeLabel: timeLabelFor(event.timestamp),
    });
  }

  return groups;
}

export async function getMissionsOverview(ownerId: string): Promise<MissionsOverviewView> {
  const missionService = getMissionService();
  const progressionService = getMissionProgressionService();

  // listMissionsWithProgress can have a real side effect — auto-completing
  // a mission and, through that, calling MissionProgressionService.
  // recordMissionCompletion (XP award, streak update, reward unlocks).
  // getOverview must run strictly after it, never in parallel — otherwise
  // a mission that completes for the first time in this exact request
  // would read stale (pre-award) progression numbers. listCandidates has
  // no such dependency and stays concurrent with the other two.
  const [candidates, missionsWithProgress] = await Promise.all([
    missionService.listCandidates(ownerId),
    missionService.listMissionsWithProgress(ownerId),
  ]);
  const progressionOverview = await progressionService.getOverview(ownerId);

  const active: MissionRow[] = [];
  const completed: MissionRow[] = [];
  const archived: MissionRow[] = [];

  for (const { mission, progress } of missionsWithProgress) {
    const row = toMissionRow(mission, progress);
    if (mission.status === "active") active.push(row);
    else if (mission.status === "completed") completed.push(row);
    else archived.push(row);
  }

  const candidateRows = candidates.map(toCandidateRow);

  return {
    hasMissions: active.length > 0 || completed.length > 0 || archived.length > 0,
    candidates: candidateRows,
    topCandidates: candidateRows.slice(0, TOP_CANDIDATES_COUNT),
    active,
    completed,
    archived,
    impactSummary: computeImpactSummary(missionsWithProgress),
    progression: toProgressionView(progressionOverview),
    history: buildHistoryEvents(missionsWithProgress, progressionOverview.unlockedRewards),
  };
}
