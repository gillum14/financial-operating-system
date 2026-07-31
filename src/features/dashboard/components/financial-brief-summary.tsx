type FinancialBriefSummaryProps = {
  highlights: string[];
  priorityAction: string;
};

export function FinancialBriefSummary({ highlights, priorityAction }: FinancialBriefSummaryProps) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold tracking-[0.14em] text-[var(--foreground-muted)] uppercase">
          Key Operational Highlights
        </p>

        <ul className="mt-2 space-y-1.5">
          {highlights.map((highlight) => (
            <li key={highlight} className="flex gap-2 text-sm leading-6 text-[var(--foreground-secondary)]">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--primary)]" />
              <span>{highlight}</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="text-xs font-semibold tracking-[0.14em] text-[var(--foreground-muted)] uppercase">
          Priority Action
        </p>

        <p className="mt-1.5 text-sm font-medium text-[var(--foreground)]">{priorityAction}</p>
      </div>
    </div>
  );
}
