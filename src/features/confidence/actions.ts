"use server";

import { revalidatePath } from "next/cache";

import { getConfidenceSnapshotCaptureService } from "@/composition/confidence-composition";
import { computeCurrentConfidenceScore } from "@/composition/confidence-query";
import type { ConfidenceScoreSnapshot } from "@/domains/confidence/types";
import { requireActionUser } from "@/lib/actions/context";
import { executeAction } from "@/lib/actions/execute";
import type { ActionResult } from "@/lib/actions/types";

// Dev/verification capture path — mirrors features/net-worth/actions.ts's
// captureManualNetWorthSnapshot exactly. No scheduler/background-job
// infrastructure exists in this codebase yet, so nothing here invents
// one; a real scheduled job capturing a Confidence Score snapshot once a
// month per owner is documented future work, not built. This action
// exists so the capture path can be exercised end-to-end without waiting
// on that scheduler.
//
// Takes NO input at all — it computes the caller's own real, current
// Confidence Score (via the one canonical computeCurrentConfidenceScore
// path, the same computation a live read would show) and persists exactly
// that, for the caller's own ownerId only (requireActionUser(), never a
// client-supplied id). Nothing here is user-adjustable; there is no way
// to submit an arbitrary score. Idempotent per (owner, date) via the
// repository's ON CONFLICT DO NOTHING.
export async function captureManualConfidenceSnapshot(): Promise<ActionResult<ConfidenceScoreSnapshot | null>> {
  return executeAction("captureManualConfidenceSnapshot", async () => {
    const user = await requireActionUser();
    const result = await computeCurrentConfidenceScore(user.id);
    const snapshotDate = new Date().toISOString().slice(0, 10);
    const snapshot = await getConfidenceSnapshotCaptureService().captureSnapshot(user.id, snapshotDate, result, "manual");
    revalidatePath("/dashboard");
    return snapshot;
  });
}
