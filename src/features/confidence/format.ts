import type { ConfidenceBandId, SignalPolarity } from "@/application/confidence/confidence-views";

// Exceptional/Strong read as genuinely good news; Stable/Building are
// encouraging-neutral (confidence-engine.md: "labels are intentionally
// encouraging rather than judgmental," not a pass/fail signal);
// Vulnerable/At Risk are the only bands that warrant the danger tone —
// still never red-alarming language, just an honest visual cue. The one
// place this mapping is defined — Dashboard's ConfidenceScoreCard and
// every component on the full /confidence page import it from here
// rather than each picking colors independently.
export const BAND_TONE: Record<ConfidenceBandId, string> = {
  exceptional: "var(--success)",
  strong: "var(--success)",
  stable: "var(--primary)",
  building: "var(--primary)",
  vulnerable: "var(--warning)",
  atRisk: "var(--danger)",
};

// positive/negative reuse the same success/danger tones as everywhere
// else in the app (Net Worth deltas, etc.); neutral and unavailable both
// read as muted — a neutral signal isn't bad news, and an unavailable one
// isn't news at all.
export const POLARITY_TONE: Record<SignalPolarity, string> = {
  positive: "var(--success)",
  negative: "var(--danger)",
  neutral: "var(--foreground-muted)",
  unavailable: "var(--foreground-muted)",
};

export function formatSignedScore(value: number): string {
  const rounded = Math.round(value);
  return `${rounded >= 0 ? "+" : ""}${rounded}`;
}

export function formatComparisonDate(dateString: string): string {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatChartDate(dateString: string): string {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}
