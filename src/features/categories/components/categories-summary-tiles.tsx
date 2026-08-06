import { Clock, Folder, Layers, TrendingUp, type LucideIcon } from "lucide-react";

import type { CategoriesOverviewView } from "@/application/categories/categories-views";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date);
}

// One continuous strip divided into sections, matching the approved
// mockup — deliberately not the shared StatCard (separate bordered tiles)
// used elsewhere, since the mockup's Categories summary is a single card.
function SummarySection({
  icon: Icon,
  label,
  value,
  caption,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  caption: string;
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3 px-5 py-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-hover)] text-[var(--foreground-secondary)]">
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-[var(--foreground-muted)]">{label}</p>
        <p className="truncate text-xl font-semibold tracking-tight text-[var(--foreground)]">{value}</p>
        <p className="text-xs text-[var(--foreground-muted)]">{caption}</p>
      </div>
    </div>
  );
}

export function CategoriesSummaryTiles({ overview }: { overview: CategoriesOverviewView }) {
  const topLevelLabel = overview.topLevelCategoryCount === 1 ? "top-level category" : "top-level categories";

  return (
    <section className="flex flex-col divide-y divide-[var(--border)] rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] sm:flex-row sm:divide-x sm:divide-y-0">
      <SummarySection
        icon={Folder}
        label="Total Categories"
        value={String(overview.totalCategories)}
        caption={`${overview.topLevelCategoryCount} ${topLevelLabel}`}
      />
      <SummarySection
        icon={Layers}
        label="Total Subcategories"
        value={String(overview.totalSubcategories)}
        caption="Across all categories"
      />
      <SummarySection
        icon={TrendingUp}
        label="Total Transactions"
        value={String(overview.totalTransactionsThisMonth)}
        caption="This month"
      />
      <SummarySection
        icon={Clock}
        label="Last Updated"
        value={overview.lastUpdated ? formatDate(overview.lastUpdated) : "—"}
        caption={overview.lastUpdated ? formatTime(overview.lastUpdated) : "No categories yet"}
      />
    </section>
  );
}
