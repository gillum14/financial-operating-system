import type { SignalPolarity } from "@/application/confidence/confidence-views";
import { POLARITY_TONE } from "../format";

// Renders a signal's machine-readable reasonCode as a small colored chip
// — the "reason-code visualization" this feature adds. Deliberately shows
// the raw code (e.g. "POSITIVE_CASH_FLOW") rather than translating it into
// prose: the human-readable half of explainability is the signal's own
// `message`, rendered alongside this badge by every caller; the badge is
// the stable, structured identifier for anyone reading closely or filing
// a bug against a specific signal.
export function ReasonCodeBadge({ reasonCode, polarity }: { reasonCode: string; polarity: SignalPolarity }) {
  const tone = POLARITY_TONE[polarity];

  return (
    <span
      className="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-[0.04em] uppercase"
      style={{ backgroundColor: `color-mix(in srgb, ${tone} 16%, transparent)`, color: tone }}
    >
      {reasonCode.replaceAll("_", " ")}
    </span>
  );
}
