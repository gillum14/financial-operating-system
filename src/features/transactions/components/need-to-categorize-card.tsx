import Badge from "@/components/ui/badge";
import { RailCard } from "@/components/ui/rail-card";

// TECH DEBT: category-suggestion / AI-categorization is explicitly out of
// scope for this slice — there's no model, heuristic, or "uncategorized
// count" signal computed anywhere. The approved mockup's populated nudge
// ("We found 15 uncategorized transactions") would fabricate a number this
// app doesn't compute. Rendered as an honest empty state instead.
export function NeedToCategorizeCard() {
  return (
    <RailCard title="Need to Categorize?" action={<Badge tone="neutral">Coming soon</Badge>}>
      <p className="text-sm text-[var(--foreground-secondary)]">Categorization review is not available yet.</p>
    </RailCard>
  );
}
