import { Lightbulb } from "lucide-react";

import Card from "@/components/ui/card";

// A deterministic, template-based sentence (confidence-presentation.ts's
// buildScoreExplanation) — never AI-generated. Answers confidence-
// engine.md's "Why?" explainability question in plain language, alongside
// the structured pillar/signal data the rest of this page shows.
export function ConfidenceExplanationCard({ explanation }: { explanation: string | null }) {
  return (
    <Card className="flex items-center gap-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-hover)] text-[var(--primary)]">
        <Lightbulb className="h-4 w-4" strokeWidth={1.75} />
      </span>
      <p className="text-sm text-[var(--foreground-secondary)]">
        {explanation ?? "Not enough data yet to explain your Confidence Score — add accounts, a budget, or goals to get started."}
      </p>
    </Card>
  );
}
