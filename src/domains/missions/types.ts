import type { Mission, MissionStatus, MissionType, NewMission } from "@/db/schema/missions";

export type { Mission, MissionStatus, MissionType };

// Everything a mission needs at the moment it's started — captured once,
// immutable afterward. status/startedAt/completedAt/id/timestamps are all
// either defaulted by the repository or owned by dedicated lifecycle
// methods, never part of a generic create call.
export type MissionCreateInput = Omit<
  NewMission,
  "id" | "status" | "startedAt" | "completedAt" | "createdAt" | "updatedAt" | "deletedAt"
>;

export type MissionStatusUpdateInput = { status: MissionStatus; completedAt?: Date | null };
