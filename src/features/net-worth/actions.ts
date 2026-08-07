"use server";

import { revalidatePath } from "next/cache";

import { getSnapshotCaptureService } from "@/composition/net-worth-composition";
import type { AccountBalanceSnapshot } from "@/domains/net-worth-history/types";
import { requireActionUser } from "@/lib/actions/context";
import { executeAction } from "@/lib/actions/execute";
import type { ActionResult } from "@/lib/actions/types";

// Dev/verification capture path (task §5): no scheduler/background-job
// infrastructure exists in this codebase yet, so nothing here invents
// one — a real scheduled job calling SnapshotCaptureService.
// captureMonthlySnapshot() once per month per owner is documented future
// work, not built. This action exists so the capture path can be
// exercised end-to-end (locally, in tests, or via an authenticated
// verification script) without waiting on that scheduler.
//
// Deliberately takes NO balance input at all — it captures whatever the
// caller's own real account balances already are, for the caller's own
// ownerId only (requireActionUser(), never a client-supplied id). This is
// not an arbitrary balance-writing UI: there is nothing here a caller can
// set, only a trigger to record what already exists. Idempotent per
// (account, date) via the repository's ON CONFLICT DO NOTHING.
export async function captureManualNetWorthSnapshot(): Promise<ActionResult<AccountBalanceSnapshot[]>> {
  return executeAction("captureManualNetWorthSnapshot", async () => {
    const user = await requireActionUser();
    const snapshots = await getSnapshotCaptureService().captureManualSnapshot(user.id);
    revalidatePath("/net-worth");
    revalidatePath("/dashboard");
    return snapshots;
  });
}
