import {
  CONFIDENCE_SCORE_SNAPSHOT_TYPES,
  type ConfidenceScoreSnapshot,
  type ConfidenceScoreSnapshotType,
  type NewConfidenceScoreSnapshot,
} from "@/db/schema/confidence-scores";

export { CONFIDENCE_SCORE_SNAPSHOT_TYPES };
export type { ConfidenceScoreSnapshot, ConfidenceScoreSnapshotType };

// Never id/createdAt (server-generated) — no update/delete input types
// either, same reasoning as AccountBalanceSnapshotCreateInput: this table
// has no legitimate post-creation write path.
export type ConfidenceScoreSnapshotCreateInput = Omit<NewConfidenceScoreSnapshot, "id" | "createdAt">;
