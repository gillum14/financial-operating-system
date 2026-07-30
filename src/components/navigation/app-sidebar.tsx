import Link from "next/link";

export function AppSidebar() {
  return (
    <aside className="w-64 border-r border-gray-200 bg-white">
      <div className="flex h-16 items-center border-b border-gray-200 px-6">
        <span className="text-xl font-semibold tracking-tight">Athena</span>
      </div>

      <nav className="flex flex-col gap-1 p-4">
        <Link
          href="/dashboard"
          className="rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-100"
        >
          Dashboard
        </Link>

        <Link
          href="/transactions"
          className="rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-100"
        >
          Transactions
        </Link>

        <Link
          href="/imports"
          className="rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-100"
        >
          Imports
        </Link>

        <Link
          href="/reports"
          className="rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-100"
        >
          Reports
        </Link>

        <Link
          href="/settings"
          className="rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-100"
        >
          Settings
        </Link>
      </nav>
    </aside>
  );
}
