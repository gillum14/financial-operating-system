import type { ConfidenceBandId, ConfidencePillarId, ConfidencePillarResult, ConfidenceSignal, SignalPolarity } from "./confidence-calculations";
import type { ConfidenceTrend } from "./confidence-history-calculations";
import type { ConfidenceCompleteness, ConfidenceHistoryPoint } from "./confidence-presentation";

// Re-exported directly, not redefined: ConfidencePillarResult/
// ConfidenceSignal are already plain, serializable data (numbers and
// strings, no Date instances or class methods) — the same reasoning
// net-worth-views.ts re-exports NetWorthCategoryItem from net-worth-
// breakdown.ts directly rather than mirroring it into a second type.
export type {
  ConfidenceBandId,
  ConfidenceCompleteness,
  ConfidenceHistoryPoint,
  ConfidencePillarId,
  ConfidencePillarResult,
  ConfidenceSignal,
  ConfidenceTrend,
  SignalPolarity,
};

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
  // Every real persisted snapshot, oldest first, for the Confidence
  // Insights timeline chart — the current live score is NOT appended here
  // (unlike Net Worth's over-time chart) since a historical Confidence
  // Score point and "today's live score" are not directly comparable in
  // the same way dollar totals are: which pillars were available can
  // differ point to point. The current score is shown separately in the
  // overview stat row.
  history: ConfidenceHistoryPoint[];
  completeness: ConfidenceCompleteness;
  // Every available signal with positive/negative polarity across all 8
  // pillars, ranked most-influential first — see confidence-
  // presentation.ts's selectPositiveSignals/selectNegativeSignals.
  positiveSignals: ConfidenceSignal[];
  negativeSignals: ConfidenceSignal[];
  // A deterministic, template-based sentence naming the strongest/weakest
  // available pillars — never AI-generated. Null when there's no evidence
  // to explain.
  explanation: string | null;
}
