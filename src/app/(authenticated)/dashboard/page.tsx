import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Welcome to Athena</h2>

        <p className="mt-2 text-gray-600">Your Financial Operating System is ready.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h3 className="font-semibold">Spending by Category</h3>
          <p className="mt-2 text-sm text-gray-500">Widget coming soon.</p>
        </div>

        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h3 className="font-semibold">Debt Payoff Progress</h3>
          <p className="mt-2 text-sm text-gray-500">Widget coming soon.</p>
        </div>

        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h3 className="font-semibold">Net Worth Trend</h3>
          <p className="mt-2 text-sm text-gray-500">Widget coming soon.</p>
        </div>
      </div>
    </section>
  );
}
