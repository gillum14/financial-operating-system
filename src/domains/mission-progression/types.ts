import type {
  MissionProgression,
  MissionReward,
  MissionRewardKey,
  MissionXpEvent,
  NewMissionProgression,
  NewMissionReward,
  NewMissionXpEvent,
} from "@/db/schema/mission-progression";

export type { MissionProgression, MissionReward, MissionRewardKey, MissionXpEvent };

export type MissionProgressionCreateInput = Omit<NewMissionProgression, "id" | "createdAt" | "updatedAt">;

export type MissionProgressionUpdateInput = Partial<
  Pick<NewMissionProgression, "totalXp" | "currentStreak" | "longestStreak" | "completedMissionCount" | "lastQualifyingCompletionDate">
>;

export type MissionXpEventCreateInput = Omit<NewMissionXpEvent, "id" | "createdAt">;

export type MissionRewardCreateInput = Omit<NewMissionReward, "id" | "unlockedAt">;
