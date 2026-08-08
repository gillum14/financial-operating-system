import type { Mission, MissionCreateInput, MissionStatusUpdateInput } from "./types";

export interface MissionRepository {
  getByIdForOwner(id: string, ownerId: string): Promise<Mission | null>;
  // Every non-deleted mission this owner has ever started, regardless of
  // status — callers filter by status themselves (see MissionService),
  // the same convention GoalRepository.listForOwner uses.
  listForOwner(ownerId: string): Promise<Mission[]>;
  create(input: MissionCreateInput): Promise<Mission>;
  updateStatus(id: string, ownerId: string, changes: MissionStatusUpdateInput): Promise<Mission>;
}
