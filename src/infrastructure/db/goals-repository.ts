import { and, desc, eq, inArray, isNull } from "drizzle-orm";

import type { DbClient } from "@/db/client";
import { goalAllocations, goalContributions, goals } from "@/db/schema";
import type { GoalAllocationRepository, GoalContributionRepository, GoalRepository } from "@/domains/goals/repository";
import type {
  Goal,
  GoalAllocation,
  GoalAllocationCreateInput,
  GoalAllocationUpdateInput,
  GoalContribution,
  GoalContributionCreateInput,
  GoalContributionUpdateInput,
  GoalCreateInput,
  GoalStatusUpdateInput,
  GoalUpdateInput,
} from "@/domains/goals/types";
import { ConflictError, NotFoundError, ValidationError } from "@/domains/errors";

export class DrizzleGoalRepository implements GoalRepository {
  constructor(private readonly db: DbClient) {}

  async getByIdForOwner(id: string, ownerId: string): Promise<Goal | null> {
    const [row] = await this.db
      .select()
      .from(goals)
      .where(and(eq(goals.id, id), eq(goals.ownerId, ownerId), isNull(goals.deletedAt)))
      .limit(1);
    return row ?? null;
  }

  async listForOwner(ownerId: string): Promise<Goal[]> {
    return this.db
      .select()
      .from(goals)
      .where(and(eq(goals.ownerId, ownerId), isNull(goals.deletedAt)))
      .orderBy(goals.displayOrder, goals.createdAt);
  }

  async create(input: GoalCreateInput & { displayOrder: number }): Promise<Goal> {
    const [row] = await this.db.insert(goals).values(input).returning();
    return row;
  }

  async update(id: string, ownerId: string, changes: GoalUpdateInput): Promise<Goal> {
    const [row] = await this.db
      .update(goals)
      .set({ ...changes, updatedAt: new Date() })
      .where(and(eq(goals.id, id), eq(goals.ownerId, ownerId), isNull(goals.deletedAt)))
      .returning();

    if (!row) {
      throw new NotFoundError(`Goal ${id} not found for owner ${ownerId}`);
    }

    return row;
  }

  async updateStatus(id: string, ownerId: string, changes: GoalStatusUpdateInput): Promise<Goal> {
    const [row] = await this.db
      .update(goals)
      .set({ ...changes, updatedAt: new Date() })
      .where(and(eq(goals.id, id), eq(goals.ownerId, ownerId), isNull(goals.deletedAt)))
      .returning();

    if (!row) {
      throw new NotFoundError(`Goal ${id} not found for owner ${ownerId}`);
    }

    return row;
  }

  async softDelete(id: string, ownerId: string): Promise<void> {
    const [row] = await this.db
      .update(goals)
      .set({ deletedAt: new Date() })
      .where(and(eq(goals.id, id), eq(goals.ownerId, ownerId), isNull(goals.deletedAt)))
      .returning();

    if (!row) {
      throw new NotFoundError(`Goal ${id} not found for owner ${ownerId}`);
    }
  }
}

export class DrizzleGoalContributionRepository implements GoalContributionRepository {
  constructor(private readonly db: DbClient) {}

  async getByIdForOwner(id: string, ownerId: string): Promise<GoalContribution | null> {
    const [row] = await this.db
      .select()
      .from(goalContributions)
      .where(and(eq(goalContributions.id, id), eq(goalContributions.ownerId, ownerId), isNull(goalContributions.deletedAt)))
      .limit(1);
    return row ?? null;
  }

  async listForOwnerAndGoals(ownerId: string, goalIds: string[]): Promise<GoalContribution[]> {
    if (goalIds.length === 0) return [];
    return this.db
      .select()
      .from(goalContributions)
      .where(
        and(
          eq(goalContributions.ownerId, ownerId),
          inArray(goalContributions.goalId, goalIds),
          isNull(goalContributions.deletedAt),
        ),
      )
      .orderBy(desc(goalContributions.contributionDate), desc(goalContributions.createdAt));
  }

  async create(input: GoalContributionCreateInput): Promise<GoalContribution> {
    const [row] = await this.db.insert(goalContributions).values(input).returning();
    return row;
  }

  async update(id: string, ownerId: string, changes: GoalContributionUpdateInput): Promise<GoalContribution> {
    const [row] = await this.db
      .update(goalContributions)
      .set({ ...changes, updatedAt: new Date() })
      .where(and(eq(goalContributions.id, id), eq(goalContributions.ownerId, ownerId), isNull(goalContributions.deletedAt)))
      .returning();

    if (!row) {
      throw new NotFoundError(`Goal contribution ${id} not found for owner ${ownerId}`);
    }

    return row;
  }

  async softDelete(id: string, ownerId: string): Promise<void> {
    const [row] = await this.db
      .update(goalContributions)
      .set({ deletedAt: new Date() })
      .where(and(eq(goalContributions.id, id), eq(goalContributions.ownerId, ownerId), isNull(goalContributions.deletedAt)))
      .returning();

    if (!row) {
      throw new NotFoundError(`Goal contribution ${id} not found for owner ${ownerId}`);
    }
  }
}

// The goal_allocations_no_overallocation trigger (see the migration) is
// the authoritative enforcement of ADR-0003's "One Dollar May Only Be
// Allocated Once" — it raises a plain Postgres exception (SQLSTATE
// P0001), which Drizzle wraps in a DrizzleQueryError with the original
// PostgresError on `.cause`. This unwraps that and re-throws as this
// codebase's normal domain-error types, so a real concurrent-write
// rejection (the case the trigger exists for — GoalService's own
// proactive check can only catch the sequential case) still surfaces as
// a ConflictError, not a generic "infrastructure" failure implying a
// pointless retry would help.
function translateAllocationWriteError(error: unknown): never {
  const cause = error instanceof Error && "cause" in error ? (error as { cause?: unknown }).cause : undefined;
  const message = cause instanceof Error ? cause.message : error instanceof Error ? error.message : String(error);

  if (message.includes("goal_allocations_overallocation")) {
    throw new ConflictError("This allocation would exceed the account's available balance.");
  }
  if (message.includes("goal_allocations_no_balance")) {
    throw new ValidationError("This account has no balance set and cannot fund a goal.");
  }
  throw error;
}

export class DrizzleGoalAllocationRepository implements GoalAllocationRepository {
  constructor(private readonly db: DbClient) {}

  async getByIdForOwner(id: string, ownerId: string): Promise<GoalAllocation | null> {
    const [row] = await this.db
      .select()
      .from(goalAllocations)
      .where(and(eq(goalAllocations.id, id), eq(goalAllocations.ownerId, ownerId), isNull(goalAllocations.deletedAt)))
      .limit(1);
    return row ?? null;
  }

  async listForOwnerAndGoals(ownerId: string, goalIds: string[]): Promise<GoalAllocation[]> {
    if (goalIds.length === 0) return [];
    return this.db
      .select()
      .from(goalAllocations)
      .where(
        and(eq(goalAllocations.ownerId, ownerId), inArray(goalAllocations.goalId, goalIds), isNull(goalAllocations.deletedAt)),
      )
      .orderBy(desc(goalAllocations.createdAt));
  }

  async listForOwnerAndAccounts(ownerId: string, accountIds: string[]): Promise<GoalAllocation[]> {
    if (accountIds.length === 0) return [];
    return this.db
      .select()
      .from(goalAllocations)
      .where(
        and(
          eq(goalAllocations.ownerId, ownerId),
          inArray(goalAllocations.accountId, accountIds),
          isNull(goalAllocations.deletedAt),
        ),
      )
      .orderBy(desc(goalAllocations.createdAt));
  }

  async create(input: GoalAllocationCreateInput): Promise<GoalAllocation> {
    try {
      const [row] = await this.db.insert(goalAllocations).values(input).returning();
      return row;
    } catch (error) {
      translateAllocationWriteError(error);
    }
  }

  async update(id: string, ownerId: string, changes: GoalAllocationUpdateInput): Promise<GoalAllocation> {
    let row: GoalAllocation | undefined;
    try {
      [row] = await this.db
        .update(goalAllocations)
        .set({ ...changes, updatedAt: new Date() })
        .where(and(eq(goalAllocations.id, id), eq(goalAllocations.ownerId, ownerId), isNull(goalAllocations.deletedAt)))
        .returning();
    } catch (error) {
      translateAllocationWriteError(error);
    }

    if (!row) {
      throw new NotFoundError(`Goal allocation ${id} not found for owner ${ownerId}`);
    }

    return row;
  }

  async softDelete(id: string, ownerId: string): Promise<void> {
    const [row] = await this.db
      .update(goalAllocations)
      .set({ deletedAt: new Date() })
      .where(and(eq(goalAllocations.id, id), eq(goalAllocations.ownerId, ownerId), isNull(goalAllocations.deletedAt)))
      .returning();

    if (!row) {
      throw new NotFoundError(`Goal allocation ${id} not found for owner ${ownerId}`);
    }
  }
}
