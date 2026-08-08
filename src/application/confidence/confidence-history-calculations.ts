import type { ConfidencePillarId, ConfidenceResult } from "./confidence-calculations";
import { PILLAR_IDS, PILLAR_LABELS } from "./confidence-calculations";

// Trend/change-attribution math — kept separate from confidence-
// calculations.ts (the current-score path) the same way net-worth-
// history-calculations.ts is kept separate from net-worth-breakdown.ts.
// This never recomputes a historical Confidence Score: "trend/history
// using real historical evidence only" is satisfied by comparing the
// CURRENT live result (from computeConfidenceScore) against the most
// recent REAL persisted snapshot — never a fabricated re-run of the
// formula against old cross-domain data (Budgets/Goals have no dated
// historical snapshots to recompute from; only Net Worth does, and even
// that isn't reused here to avoid inventing a partial, misleadingly-
// precise "historical score"). This mirrors Net Worth History's own
// "first snapshot establishes baseline" behavior exactly: with zero
// snapshots, there is no trend — an honest unavailable state, not a
// fabricated one.

export interface StoredConfidenceSnapshot {
  snapshotDate: string;
  overallScore: number | null;
  pillarScores: Record<string, number | null>;
}

// The most recent stored snapshot, or null if none exist yet. Callers
// pass snapshots already sorted; this mirrors selectComparisonPoint in
// net-worth-history-calculations.ts exactly (same "last element of an
// ascending list" contract).
export function selectComparisonSnapshot(snapshotsAscending: StoredConfidenceSnapshot[]): StoredConfidenceSnapshot | null {
  return snapshotsAscending.length > 0 ? snapshotsAscending[snapshotsAscending.length - 1] : null;
}

export interface ConfidenceChange {
  comparisonDate: string;
  absoluteChange: number;
}

// Deterministic, real-evidence-only change attribution: overall score
// delta plus a per-pillar delta for every pillar present (as a real
// number) in BOTH the current result and the comparison snapshot — a
// pillar unavailable in either point is simply omitted ("where
// supported"), never interpolated or assumed unchanged.
export interface ConfidenceTrend {
  comparisonDate: string;
  overallChange: ConfidenceChange | null;
  pillarChanges: Partial<Record<ConfidencePillarId, ConfidenceChange>>;
}

export function computeConfidenceTrend(current: ConfidenceResult, comparison: StoredConfidenceSnapshot | null): ConfidenceTrend | null {
  if (!comparison) return null;

  const overallChange =
    current.overallScore !== null && comparison.overallScore !== null
      ? { comparisonDate: comparison.snapshotDate, absoluteChange: current.overallScore - comparison.overallScore }
      : null;

  const pillarChanges: Partial<Record<ConfidencePillarId, ConfidenceChange>> = {};
  for (const pillar of current.pillars) {
    const comparisonScore = comparison.pillarScores[pillar.id];
    if (pillar.score === null || comparisonScore === null || comparisonScore === undefined) continue;
    pillarChanges[pillar.id] = { comparisonDate: comparison.snapshotDate, absoluteChange: pillar.score - comparisonScore };
  }

  return { comparisonDate: comparison.snapshotDate, overallChange, pillarChanges };
}

// Flattens a ConfidenceResult into the plain pillarScores map the
// snapshot table stores — the one place that shape is derived, so a
// capture can never disagree with what computeConfidenceScore actually
// returned.
export function toPillarScoresRecord(result: ConfidenceResult): Record<ConfidencePillarId, number | null> {
  const record = {} as Record<ConfidencePillarId, number | null>;
  for (const id of PILLAR_IDS) {
    const pillar = result.pillars.find((p) => p.id === id);
    record[id] = pillar ? pillar.score : null;
  }
  return record;
}

export { PILLAR_LABELS };
