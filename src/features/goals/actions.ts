"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { GOAL_PRIORITIES, GOAL_TYPES } from "@/db/schema/goals";
import { getGoalService } from "@/composition/goals-composition";
import type { Goal, GoalAllocation, GoalContribution } from "@/domains/goals/types";
import { requireActionUser } from "@/lib/actions/context";
import { executeAction } from "@/lib/actions/execute";
import type { ActionResult } from "@/lib/actions/types";
import { parseAction } from "@/lib/actions/validation";

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a YYYY-MM-DD date");

const goalIdSchema = z.object({ goalId: z.string().uuid() });
const contributionIdSchema = z.object({ contributionId: z.string().uuid() });
const allocationIdSchema = z.object({ allocationId: z.string().uuid() });

// No `ownerId` field, ever — the only owner a Server Action in this file
// will persist is requireActionUser()'s user.id.
const createGoalInputSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().optional(),
  targetAmount: z.number().positive().finite(),
  targetDate: dateStringSchema.optional(),
  goalType: z.enum(GOAL_TYPES),
  priority: z.enum(GOAL_PRIORITIES).optional(),
  icon: z.string().trim().optional(),
  color: z.string().trim().optional(),
  categoryId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(),
});

const updateGoalInputSchema = z.object({
  goalId: z.string().uuid(),
  title: z.string().trim().min(1).optional(),
  description: z.string().trim().optional(),
  targetAmount: z.number().positive().finite().optional(),
  targetDate: dateStringSchema.optional(),
  goalType: z.enum(GOAL_TYPES).optional(),
  priority: z.enum(GOAL_PRIORITIES).optional(),
  icon: z.string().trim().optional(),
  color: z.string().trim().optional(),
  categoryId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(),
});

const addContributionInputSchema = z.object({
  goalId: z.string().uuid(),
  amount: z.number().positive().finite(),
  contributionDate: dateStringSchema,
  note: z.string().trim().optional(),
});

const updateContributionInputSchema = z.object({
  contributionId: z.string().uuid(),
  amount: z.number().positive().finite().optional(),
  contributionDate: dateStringSchema.optional(),
  note: z.string().trim().optional(),
});

const allocateFundsInputSchema = z.object({
  goalId: z.string().uuid(),
  accountId: z.string().uuid(),
  amount: z.number().positive().finite(),
});

const updateAllocationInputSchema = z.object({
  allocationId: z.string().uuid(),
  amount: z.number().positive().finite(),
});

export async function createGoal(rawInput: unknown): Promise<ActionResult<Goal>> {
  return executeAction("createGoal", async () => {
    const user = await requireActionUser();
    const input = parseAction(createGoalInputSchema, rawInput);

    const goal = await getGoalService().createGoal({ ...input, ownerId: user.id });
    revalidatePath("/goals");
    revalidatePath("/dashboard");
    return goal;
  });
}

export async function updateGoal(rawInput: unknown): Promise<ActionResult<Goal>> {
  return executeAction("updateGoal", async () => {
    const user = await requireActionUser();
    const { goalId, ...changes } = parseAction(updateGoalInputSchema, rawInput);

    const goal = await getGoalService().updateGoal(goalId, user.id, changes);
    revalidatePath("/goals");
    revalidatePath("/dashboard");
    return goal;
  });
}

export async function completeGoal(rawInput: unknown): Promise<ActionResult<Goal>> {
  return executeAction("completeGoal", async () => {
    const user = await requireActionUser();
    const { goalId } = parseAction(goalIdSchema, rawInput);

    const goal = await getGoalService().completeGoal(goalId, user.id);
    revalidatePath("/goals");
    revalidatePath("/dashboard");
    return goal;
  });
}

// Archiving is not deletion — no hard-delete path exists for goal history
// at any layer (repository, RLS grants, or this action). See
// GoalService.archiveGoal.
export async function archiveGoal(rawInput: unknown): Promise<ActionResult<Goal>> {
  return executeAction("archiveGoal", async () => {
    const user = await requireActionUser();
    const { goalId } = parseAction(goalIdSchema, rawInput);

    const goal = await getGoalService().archiveGoal(goalId, user.id);
    revalidatePath("/goals");
    revalidatePath("/dashboard");
    return goal;
  });
}

// Active -> Paused. Existing allocations/contributions are untouched; only
// new ones are refused while paused (see GoalService.FUNDABLE_STATUSES).
export async function pauseGoal(rawInput: unknown): Promise<ActionResult<Goal>> {
  return executeAction("pauseGoal", async () => {
    const user = await requireActionUser();
    const { goalId } = parseAction(goalIdSchema, rawInput);

    const goal = await getGoalService().pauseGoal(goalId, user.id);
    revalidatePath("/goals");
    revalidatePath("/dashboard");
    return goal;
  });
}

// Paused -> Active, the inverse of pauseGoal.
export async function resumeGoal(rawInput: unknown): Promise<ActionResult<Goal>> {
  return executeAction("resumeGoal", async () => {
    const user = await requireActionUser();
    const { goalId } = parseAction(goalIdSchema, rawInput);

    const goal = await getGoalService().resumeGoal(goalId, user.id);
    revalidatePath("/goals");
    revalidatePath("/dashboard");
    return goal;
  });
}

export async function addGoalContribution(rawInput: unknown): Promise<ActionResult<GoalContribution>> {
  return executeAction("addGoalContribution", async () => {
    const user = await requireActionUser();
    const input = parseAction(addContributionInputSchema, rawInput);

    const contribution = await getGoalService().addContribution({ ...input, ownerId: user.id });
    revalidatePath("/goals");
    revalidatePath("/dashboard");
    return contribution;
  });
}

export async function updateGoalContribution(rawInput: unknown): Promise<ActionResult<GoalContribution>> {
  return executeAction("updateGoalContribution", async () => {
    const user = await requireActionUser();
    const { contributionId, ...changes } = parseAction(updateContributionInputSchema, rawInput);

    const contribution = await getGoalService().updateContribution(contributionId, user.id, changes);
    revalidatePath("/goals");
    revalidatePath("/dashboard");
    return contribution;
  });
}

// Soft-delete only — no DELETE grant exists on goal_contributions at any
// layer, matching every other owned table in this schema.
export async function removeGoalContribution(rawInput: unknown): Promise<ActionResult<void>> {
  return executeAction("removeGoalContribution", async () => {
    const user = await requireActionUser();
    const { contributionId } = parseAction(contributionIdSchema, rawInput);

    await getGoalService().removeContribution(contributionId, user.id);
    revalidatePath("/goals");
    revalidatePath("/dashboard");
  });
}

// ---- Goal Allocations (ADR-0003 Goal Allocation Model) --------------------

export async function allocateGoalFunds(rawInput: unknown): Promise<ActionResult<GoalAllocation>> {
  return executeAction("allocateGoalFunds", async () => {
    const user = await requireActionUser();
    const input = parseAction(allocateFundsInputSchema, rawInput);

    const allocation = await getGoalService().allocateFunds({ ...input, ownerId: user.id });
    revalidatePath("/goals");
    revalidatePath("/dashboard");
    revalidatePath("/accounts");
    return allocation;
  });
}

export async function updateGoalAllocation(rawInput: unknown): Promise<ActionResult<GoalAllocation>> {
  return executeAction("updateGoalAllocation", async () => {
    const user = await requireActionUser();
    const { allocationId, amount } = parseAction(updateAllocationInputSchema, rawInput);

    const allocation = await getGoalService().editAllocation(allocationId, user.id, amount);
    revalidatePath("/goals");
    revalidatePath("/dashboard");
    revalidatePath("/accounts");
    return allocation;
  });
}

// Soft-delete only — no DELETE grant exists on goal_allocations at any
// layer, matching every other owned table in this schema.
export async function removeGoalAllocation(rawInput: unknown): Promise<ActionResult<void>> {
  return executeAction("removeGoalAllocation", async () => {
    const user = await requireActionUser();
    const { allocationId } = parseAction(allocationIdSchema, rawInput);

    await getGoalService().removeAllocation(allocationId, user.id);
    revalidatePath("/goals");
    revalidatePath("/dashboard");
    revalidatePath("/accounts");
  });
}
