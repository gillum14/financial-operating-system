import { and, desc, eq, isNull } from "drizzle-orm";

import type { DbClient } from "@/db/client";
import { missions } from "@/db/schema";
import { NotFoundError } from "@/domains/errors";
import type { MissionRepository } from "@/domains/missions/repository";
import type { Mission, MissionCreateInput, MissionStatusUpdateInput } from "@/domains/missions/types";

export class DrizzleMissionRepository implements MissionRepository {
  constructor(private readonly db: DbClient) {}

  async getByIdForOwner(id: string, ownerId: string): Promise<Mission | null> {
    const [row] = await this.db
      .select()
      .from(missions)
      .where(and(eq(missions.id, id), eq(missions.ownerId, ownerId), isNull(missions.deletedAt)))
      .limit(1);
    return row ?? null;
  }

  async listForOwner(ownerId: string): Promise<Mission[]> {
    return this.db
      .select()
      .from(missions)
      .where(and(eq(missions.ownerId, ownerId), isNull(missions.deletedAt)))
      .orderBy(desc(missions.startedAt));
  }

  async create(input: MissionCreateInput): Promise<Mission> {
    const [row] = await this.db.insert(missions).values(input).returning();
    return row;
  }

  async updateStatus(id: string, ownerId: string, changes: MissionStatusUpdateInput): Promise<Mission> {
    const [row] = await this.db
      .update(missions)
      .set({ ...changes, updatedAt: new Date() })
      .where(and(eq(missions.id, id), eq(missions.ownerId, ownerId), isNull(missions.deletedAt)))
      .returning();

    if (!row) {
      throw new NotFoundError(`Mission ${id} not found for owner ${ownerId}`);
    }

    return row;
  }
}
