import type {
  MissionProgression,
  MissionProgressionCreateInput,
  MissionProgressionUpdateInput,
  MissionReward,
  MissionRewardCreateInput,
  MissionXpEvent,
  MissionXpEventCreateInput,
} from "./types";

export interface MissionProgressionRepository {
  getByOwnerId(ownerId: string): Promise<MissionProgression | null>;
  // Atomic, transaction-safe create-or-fetch for the one-per-owner row —
  // implemented via ON CONFLICT DO NOTHING on the unique(owner_id) index,
  // never a plain insert wrapped in try/catch (a unique_violation
  // mid-transaction aborts the whole transaction in Postgres, which
  // catching the JS exception doesn't undo).
  getOrCreateForOwner(ownerId: string, defaults: MissionProgressionCreateInput): Promise<MissionProgression>;
  updateStats(ownerId: string, changes: MissionProgressionUpdateInput): Promise<MissionProgression>;
}

export interface MissionXpEventRepository {
  // Returns null (never throws) when an XP event already exists for this
  // mission — the unique index on mission_id is what makes "exactly once
  // per mission" a real database guarantee; a caller hitting that
  // conflict is an expected, safe outcome to check for, not an error.
  createIfNotExists(input: MissionXpEventCreateInput): Promise<MissionXpEvent | null>;
  listForOwner(ownerId: string): Promise<MissionXpEvent[]>;
}

export interface MissionRewardRepository {
  // Same "return null instead of throwing" pattern for a duplicate unlock
  // attempt — re-checking every reward's eligibility after every
  // completion is meant to be safe to do unconditionally.
  createIfNotExists(input: MissionRewardCreateInput): Promise<MissionReward | null>;
  listForOwner(ownerId: string): Promise<MissionReward[]>;
}
