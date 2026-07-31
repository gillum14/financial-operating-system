import { Gauge } from "lucide-react";

import Card from "@/components/ui/card";
import type { ConfidenceScore, ConfidenceTrend } from "@/features/dashboard/types";

type ConfidenceScoreCardProps = {
  score: ConfidenceScore;
  trends: ConfidenceTrend[];
  className?: string;
};

export function ConfidenceScoreCard({ score, trends, className = "" }: ConfidenceScoreCardProps) {
  return (
    <Card className={className}>
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold tracking-[0.12em] text-[var(--foreground-muted)] uppercase">
          Confidence Score
        </p>

        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--surface-hover)] text-[var(--foreground-secondary)]">
          <Gauge className="h-4 w-4" strokeWidth={1.75} />
        </span>
      </div>

      <p className="mt-2 text-5xl font-bold tracking-tight text-[var(--foreground)]">{score.score}</p>

      <p className="mt-1 text-sm text-[var(--success)]">{score.label}</p>

      <ul className="mt-4 space-y-1.5 border-t border-[var(--border-subtle)] pt-3">
        {trends.map((trend) => (
          <li key={trend.label} className="flex items-center justify-between text-xs">
            <span className="text-[var(--foreground-muted)]">{trend.label}</span>
            <span
              className={`font-medium ${trend.value >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}`}
            >
              {trend.value >= 0 ? "+" : ""}
              {trend.value}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
