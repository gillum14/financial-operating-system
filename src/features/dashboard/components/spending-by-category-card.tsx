import Card from "@/components/ui/card";
import CardHeader from "@/components/ui/card-header";
import {
  CategoryLegendTable,
  SpendingByCategoryChart,
} from "@/components/charts/spending-by-category-chart";
import type { CategorySpend } from "@/features/dashboard/types";

export function SpendingByCategoryCard({
  categories,
  total,
  periodLabel,
  updatedLabel,
}: {
  categories: CategorySpend[];
  total: number;
  periodLabel: string;
  updatedLabel: string;
}) {
  return (
    <Card>
      <CardHeader title="Spending by Category" subtitle={periodLabel}>
        <a href="#" className="text-sm font-medium text-[var(--primary)] hover:underline">
          View report
        </a>
      </CardHeader>

      <div className="flex min-w-0 items-center gap-4">
        <SpendingByCategoryChart data={categories} total={total} />
        <CategoryLegendTable data={categories} />
      </div>

      <p className="mt-4 text-xs text-[var(--foreground-muted)]">{updatedLabel}</p>
    </Card>
  );
}
