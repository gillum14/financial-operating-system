import { RailCard } from "@/components/ui/rail-card";

const TIPS = [
  "Categories support two levels: a top-level category and its subcategories.",
  "Drag and drop rows to reorder them for this session — order isn't saved between visits.",
  "A category with an active subcategory or transactions can't be archived.",
];

export function QuickTipsCard() {
  return (
    <RailCard title="Quick Tips">
      <ul className="space-y-2 text-sm text-[var(--foreground-secondary)]">
        {TIPS.map((tip) => (
          <li key={tip} className="flex gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--foreground-muted)]" aria-hidden="true" />
            <span>{tip}</span>
          </li>
        ))}
      </ul>

      <p className="mt-3 border-t border-[var(--border)] pt-3 text-xs text-[var(--foreground-muted)]">
        Category icons may be added in a future release.
      </p>
    </RailCard>
  );
}
