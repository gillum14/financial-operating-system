import type { ConfidenceScoreSnapshot, ConfidenceScoreSnapshotCreateInput } from "./types";

export interface ConfidenceScoreSnapshotRepository {
  getByIdForOwner(id: string, ownerId: string): Promise<ConfidenceScoreSnapshot | null>;
  // Every snapshot for this owner, oldest first — the trend/comparison-
  // point read (see confidence-history-calculations.ts's
  // selectComparisonPoint, mirroring Net Worth's identically-named
  // function).
  listForOwner(ownerId: string): Promise<ConfidenceScoreSnapshot[]>;
  // Idempotent single-row capture: a (ownerId, snapshotDate) pair that
  // already exists is silently skipped (ON CONFLICT DO NOTHING), never
  // overwritten — this table has no update path. Returns the row actually
  // inserted, or null if it already existed.
  create(input: ConfidenceScoreSnapshotCreateInput): Promise<ConfidenceScoreSnapshot | null>;
}
