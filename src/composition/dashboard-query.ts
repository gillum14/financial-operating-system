import "server-only";

import { toDashboardSnapshot } from "@/application/dashboard/dashboard-data-adapter";
import type { DashboardSnapshot } from "@/application/dashboard/types";

import { getDashboardService } from "./dashboard-composition";

export interface DashboardSnapshotOptions {
  recentActivityLimit?: number;
  periodDays?: number;
}

// Server-only query function: orchestrates DashboardService + the adapter
// and returns presentation-ready data. No JSX, no try/catch — errors
// (connection failures, thrown by resolveDevelopmentOwnerId(), etc.)
// propagate as-is so the caller (or a Next.js error boundary) decides how
// to present them.
export async function getDashboardSnapshot(
  ownerId: string,
  options: DashboardSnapshotOptions = {},
): Promise<DashboardSnapshot> {
  const raw = await getDashboardService().getDashboardData(ownerId, options);
  return toDashboardSnapshot(raw);
}
