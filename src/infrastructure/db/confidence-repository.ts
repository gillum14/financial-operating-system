import { and, asc, eq } from "drizzle-orm";

import type { DbClient } from "@/db/client";
import { confidenceScoreSnapshots } from "@/db/schema";
import type { ConfidenceScoreSnapshotRepository } from "@/domains/confidence/repository";
import type { ConfidenceScoreSnapshot, ConfidenceScoreSnapshotCreateInput } from "@/domains/confidence/types";

export class DrizzleConfidenceScoreSnapshotRepository implements ConfidenceScoreSnapshotRepository {
  constructor(private readonly db: DbClient) {}

  async getByIdForOwner(id: string, ownerId: string): Promise<ConfidenceScoreSnapshot | null> {
    const [row] = await this.db
      .select()
      .from(confidenceScoreSnapshots)
      .where(and(eq(confidenceScoreSnapshots.id, id), eq(confidenceScoreSnapshots.ownerId, ownerId)))
      .limit(1);
    return row ?? null;
  }

  async listForOwner(ownerId: string): Promise<ConfidenceScoreSnapshot[]> {
    return this.db
      .select()
      .from(confidenceScoreSnapshots)
      .where(eq(confidenceScoreSnapshots.ownerId, ownerId))
      .orderBy(asc(confidenceScoreSnapshots.snapshotDate));
  }

  async create(input: ConfidenceScoreSnapshotCreateInput): Promise<ConfidenceScoreSnapshot | null> {
    // ON CONFLICT DO NOTHING against confidence_score_snapshots_owner_
    // date_idx — same idempotency pattern as account_balance_snapshots'
    // repository; a re-run for a date that's already captured comes back
    // empty rather than throwing or silently pretending to re-capture.
    const [row] = await this.db.insert(confidenceScoreSnapshots).values(input).onConflictDoNothing().returning();
    return row ?? null;
  }
}
