type ProgressBarProps = {
  percent: number;
  className?: string;
};

export default function ProgressBar({ percent, className = "" }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, percent));

  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-hover)] ${className}`}
    >
      <div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${clamped}%` }} />
    </div>
  );
}
