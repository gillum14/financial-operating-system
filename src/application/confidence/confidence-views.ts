import type { ConfidenceBandId, ConfidencePillarId, ConfidencePillarResult, ConfidenceSignal } from "./confidence-calculations";
import type { ConfidenceTrend } from "./confidence-history-calculations";

// Re-exported directly, not redefined: ConfidencePillarResult/
// ConfidenceSignal are already plain, serializable data (numbers and
// strings, no Date instances or class methods) — the same reasoning
// net-worth-views.ts re-exports NetWorthCategoryItem from net-worth-
// breakdown.ts directly rather than mirroring it into a second type.
export type { ConfidenceBandId, ConfidencePillarId, ConfidencePillarResult, ConfidenceSignal, ConfidenceTrend };

// Presentation-shaped view model for the Confidence Engine, kept outside
// src/composition/ (server-only) so "use client" components can import
// this *type* without pulling in a composition-root module — same pattern
// as Net Worth/Budgets/Goals/Reports.
export interface ConfidenceOverviewView {
  // True once at least one pillar has real evidence — drives the honest
  // "not enough data yet" empty state vs. the populated score.
  hasEvidence: boolean;
  overallScore: number | null;
  band: { id: ConfidenceBandId; label: string } | null;
  pillars: ConfidencePillarResult[];
  // Pre-formatted server-side (e.g. "Aug 7, 2026, 3:45 PM") — never
  // formatted in a "use client" component, matching every other page's
  // convention.
  asOfLabel: string;
  // True once at least one historical Confidence Score snapshot exists —
  // drives the trend section's real-data vs. "history unavailable" state.
  // Never conflated with hasEvidence: a brand-new owner can have current
  // evidence (hasEvidence: true) with zero history (hasHistory: false).
  hasHistory: boolean;
  trend: ConfidenceTrend | null;
}
