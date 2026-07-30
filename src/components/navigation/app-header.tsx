export function AppHeader() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-500">Financial Operating System</span>
      </div>
    </header>
  );
}
