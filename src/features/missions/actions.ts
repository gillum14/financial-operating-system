"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { MISSION_TYPES } from "@/db/schema/missions";
import { getMissionService } from "@/composition/missions-composition";
import type { Mission } from "@/domains/missions/types";
import { requireActionUser } from "@/lib/actions/context";
import { executeAction } from "@/lib/actions/execute";
import type { ActionResult } from "@/lib/actions/types";
import { parseAction } from "@/lib/actions/validation";

// No `ownerId` field, ever — the only owner a Server Action in this file
// will persist is requireActionUser()'s user.id (same convention as
// features/goals/actions.ts).
const startMissionInputSchema = z.object({
  missionType: z.enum(MISSION_TYPES),
  relatedGoalId: z.string().uuid().optional(),
  relatedAccountId: z.string().uuid().optional(),
  relatedBudgetPeriodId: z.string().uuid().optional(),
  isDailyMission: z.boolean().optional(),
});

const missionIdSchema = z.object({ missionId: z.string().uuid() });

const createCustomMissionInputSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(500),
});

export async function startMission(rawInput: unknown): Promise<ActionResult<Mission>> {
  return executeAction("startMission", async () => {
    const user = await requireActionUser();
    const input = parseAction(startMissionInputSchema, rawInput);

    const mission = await getMissionService().startMission({ ...input, ownerId: user.id });
    revalidatePath("/missions");
    revalidatePath("/dashboard");
    return mission;
  });
}

// User-authored mission — created directly as Active, no eligibility
// check (there's nothing to be eligible against; see MissionService.
// createCustomMission).
export async function createCustomMission(rawInput: unknown): Promise<ActionResult<Mission>> {
  return executeAction("createCustomMission", async () => {
    const user = await requireActionUser();
    const input = parseAction(createCustomMissionInputSchema, rawInput);

    const mission = await getMissionService().createCustomMission({ ...input, ownerId: user.id });
    revalidatePath("/missions");
    revalidatePath("/dashboard");
    return mission;
  });
}

// The one manual completion action in the system — restricted server-side
// to missionType "custom" by MissionService.completeCustomMission itself,
// not just by this action only being wired to custom-mission UI.
export async function completeCustomMission(rawInput: unknown): Promise<ActionResult<Mission>> {
  return executeAction("completeCustomMission", async () => {
    const user = await requireActionUser();
    const { missionId } = parseAction(missionIdSchema, rawInput);

    const mission = await getMissionService().completeCustomMission(missionId, user.id);
    revalidatePath("/missions");
    revalidatePath("/dashboard");
    return mission;
  });
}

// Archiving is not deletion — no hard-delete path exists for mission
// history at any layer (repository, RLS grants, or this action). See
// MissionService.archiveMission.
export async function archiveMission(rawInput: unknown): Promise<ActionResult<Mission>> {
  return executeAction("archiveMission", async () => {
    const user = await requireActionUser();
    const { missionId } = parseAction(missionIdSchema, rawInput);

    const mission = await getMissionService().archiveMission(missionId, user.id);
    revalidatePath("/missions");
    revalidatePath("/dashboard");
    return mission;
  });
}
