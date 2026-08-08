import { bandForScore, type ConfidenceBandId, type ConfidencePillarResult, type ConfidenceSignal } from "./confidence-calculations";

// Pure presentation-layer derivations from an already-computed
// ConfidenceResult/ConfidencePillarResult[] — never a second scoring
// calculation. Everything here reads scores/statuses computeConfidence
// Score already produced and reshapes, filters, sorts, or narrates them;
// nothing in this file computes a new number that didn't already exist.
// This is what Confidence Insights V1 (the presentation layer) is built
// from — confidence-calculations.ts and confidence-history-calculations.ts
// remain the only files that do actual scoring/trend math.

// ---- Completeness ---------------------------------------------------------

export interface ConfidenceCompleteness {
  availablePillars: number;
  totalPillars: number;
  // Sum of the *raw* spec weights (confidence-engine.md's "The Eight
  // Dimensions") for pillars with real evidence right now — "how much of
  // the full 100-point model is actually backed by real data," distinct
  // from ConfidencePillarResult.effectiveWeight (which is post-
  // renormalization and always sums to 100% once any pillar is
  // available). A brand-new owner with only Cash Flow available has
  // effectiveWeight 100% for that one pillar but coveredWeightPercent
  // only 20% — the honest "how much of the real spec are we actually
  // measuring for you" number.
  coveredWeightPercent: number;
  unavailablePillars: ConfidencePillarResult[];
}

export function computeCompleteness(pillars: ConfidencePillarResult[]): ConfidenceCompleteness {
  const available = pillars.filter((pillar) => pillar.status === "available");
  const unavailable = pillars.filter((pillar) => pillar.status === "unavailable");
  const coveredWeightPercent = available.reduce((sum, pillar) => sum + pillar.weight, 0) * 100;

  return {
    availablePillars: available.length,
    totalPillars: pillars.length,
    coveredWeightPercent,
    unavailablePillars: unavailable,
  };
}

// ---- Positive / negative contributors --------------------------------------

// Every available signal across every pillar with the given polarity,
// most-influential first (largest distance from the neutral 50 midpoint
// every signal curve in confidence-calculations.ts is centered on).
// "Distance from 50" rather than raw score so a positive signal at 95 and
// a negative signal at 5 rank as equally strong contributors in their
// respective lists, not asymmetrically.
function sortByInfluence(signals: ConfidenceSignal[]): ConfidenceSignal[] {
  return [...signals].sort((a, b) => Math.abs((b.score ?? 50) - 50) - Math.abs((a.score ?? 50) - 50));
}

export function selectPositiveSignals(pillars: ConfidencePillarResult[]): ConfidenceSignal[] {
  return sortByInfluence(pillars.flatMap((pillar) => pillar.signals).filter((signal) => signal.polarity === "positive"));
}

export function selectNegativeSignals(pillars: ConfidencePillarResult[]): ConfidenceSignal[] {
  return sortByInfluence(pillars.flatMap((pillar) => pillar.signals).filter((signal) => signal.polarity === "negative"));
}

// ---- Score explanation ------------------------------------------------------

// A deterministic, template-based sentence built entirely from already-
// computed pillar scores — never AI-generated, never a new calculation.
// Names the strongest and weakest AVAILABLE pillars (by score) so
// "Why did my score change / what's helping / what's hurting" (confidence-
// engine.md's explainability questions) has a plain-language answer
// alongside the structured pillar/signal data. Returns null when there's
// no evidence to explain — never a fabricated sentence about an absent
// score.
export function buildScoreExplanation(
  overallScore: number | null,
  band: { id: ConfidenceBandId; label: string } | null,
  pillars: ConfidencePillarResult[],
): string | null {
  if (overallScore === null || band === null) return null;

  const available = pillars.filter(
    (pillar): pillar is ConfidencePillarResult & { score: number } => pillar.status === "available" && pillar.score !== null,
  );
  if (available.length === 0) return null;

  const strongest = [...available].sort((a, b) => b.score - a.score)[0];
  const weakest = [...available].sort((a, b) => a.score - b.score)[0];

  if (available.length === 1 || strongest.id === weakest.id) {
    return `Your Confidence Score is ${overallScore} (${band.label}), based on ${strongest.label} — the only pillar with enough data to measure yet.`;
  }

  return `Your Confidence Score is ${overallScore} (${band.label}). ${strongest.label} is your strongest area right now, while ${weakest.label} has the most room to improve.`;
}

// ---- Timeline / trend visualization -----------------------------------------

export interface ConfidenceHistoryPoint {
  snapshotDate: string;
  overallScore: number | null;
  band: { id: ConfidenceBandId; label: string } | null;
}

// Reuses bandForScore (the exact function computeConfidenceScore itself
// calls) rather than a second band-lookup — a historical point's band is
// derived the same way the current score's band always has been.
export function toHistoryPoint(snapshotDate: string, overallScore: number | null): ConfidenceHistoryPoint {
  return { snapshotDate, overallScore, band: overallScore === null ? null : bandForScore(overallScore) };
}
