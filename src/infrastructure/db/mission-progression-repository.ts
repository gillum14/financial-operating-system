import { desc, eq } from "drizzle-orm";

import type { DbClient } from "@/db/client";
import { missionProgression, missionRewards, missionXpEvents } from "@/db/schema";
import { NotFoundError } from "@/domains/errors";
import type {
  MissionProgressionRepository,
  MissionRewardRepository,
  MissionXpEventRepository,
} from "@/domains/mission-progression/repository";
import type {
  MissionProgression,
  MissionProgressionCreateInput,
  MissionProgressionUpdateInput,
  MissionReward,
  MissionRewardCreateInput,
  MissionXpEvent,
  MissionXpEventCreateInput,
} from "@/domains/mission-progression/types";

export class DrizzleMissionProgressionRepository implements MissionProgressionRepository {
  constructor(private readonly db: DbClient) {}

  async getByOwnerId(ownerId: string): Promise<MissionProgression | null> {
    const [row] = await this.db.select().from(missionProgression).where(eq(missionProgression.ownerId, ownerId)).limit(1);
    return row ?? null;
  }

  async getOrCreateForOwner(ownerId: string, defaults: MissionProgressionCreateInput): Promise<MissionProgression> {
    const [inserted] = await this.db.insert(missionProgression).values(defaults).onConflictDoNothing().returning();
    if (inserted) return inserted;

    // Conflict on unique(owner_id) — another call already created it
    // (either earlier in this same request, or a genuine concurrent
    // race); re-read rather than treating that as an error.
    const existing = await this.getByOwnerId(ownerId);
    if (!existing) {
      throw new NotFoundError(`Mission progression not found for owner ${ownerId} after a conflicting insert`);
    }
    return existing;
  }

  async updateStats(ownerId: string, changes: MissionProgressionUpdateInput): Promise<MissionProgression> {
    const [row] = await this.db
      .update(missionProgression)
      .set({ ...changes, updatedAt: new Date() })
      .where(eq(missionProgression.ownerId, ownerId))
      .returning();

    if (!row) {
      throw new NotFoundError(`Mission progression not found for owner ${ownerId}`);
    }

    return row;
  }
}

export class DrizzleMissionXpEventRepository implements MissionXpEventRepository {
  constructor(private readonly db: DbClient) {}

  // ON CONFLICT DO NOTHING rather than try/catch around a plain insert:
  // a unique_violation raised mid-transaction aborts the *entire*
  // transaction in Postgres (SQLSTATE 25P02, "current transaction is
  // aborted") until it's rolled back — catching the exception in JS
  // doesn't undo that server-side state, so any later query in the same
  // transaction would fail even though the JS code "handled" the error.
  // ON CONFLICT DO NOTHING never raises in the first place: it just skips
  // the insert and returns zero rows, leaving the transaction healthy.
  async createIfNotExists(input: MissionXpEventCreateInput): Promise<MissionXpEvent | null> {
    const [row] = await this.db.insert(missionXpEvents).values(input).onConflictDoNothing().returning();
    return row ?? null;
  }

  async listForOwner(ownerId: string): Promise<MissionXpEvent[]> {
    return this.db.select().from(missionXpEvents).where(eq(missionXpEvents.ownerId, ownerId)).orderBy(desc(missionXpEvents.createdAt));
  }
}

export class DrizzleMissionRewardRepository implements MissionRewardRepository {
  constructor(private readonly db: DbClient) {}

  // Same ON CONFLICT DO NOTHING reasoning as DrizzleMissionXpEventRepository
  // above — re-checking every reward's eligibility after every completion
  // must stay safe to do unconditionally, including within a single
  // wrapping transaction (e.g. a withRollback-based test).
  async createIfNotExists(input: MissionRewardCreateInput): Promise<MissionReward | null> {
    const [row] = await this.db.insert(missionRewards).values(input).onConflictDoNothing().returning();
    return row ?? null;
  }

  async listForOwner(ownerId: string): Promise<MissionReward[]> {
    return this.db.select().from(missionRewards).where(eq(missionRewards.ownerId, ownerId)).orderBy(desc(missionRewards.unlockedAt));
  }
}
