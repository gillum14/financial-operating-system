import { Bell, Calendar, Search } from "lucide-react";

function getTodayParts() {
  const today = new Date();

  return {
    label: new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(today),
    weekday: new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(today),
  };
}

export function AppHeader() {
  const today = getTodayParts();

  return (
    <header className="flex h-16 shrink-0 items-center justify-end gap-4 border-b border-[var(--border)] bg-[var(--surface)] px-6">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--foreground-muted)]"
          strokeWidth={1.75}
        />
        <input
          type="search"
          placeholder="Search Mocal"
          className="w-64 rounded-[calc(var(--radius)-6px)] border border-[var(--border)] bg-[var(--background)] py-2 pr-3 pl-9 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:border-[var(--primary)] focus:outline-none"
        />
      </div>

      <button
        type="button"
        aria-label="Notifications"
        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--foreground-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
      >
        <Bell className="h-4.5 w-4.5" strokeWidth={1.75} />
        <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
      </button>

      <div className="flex items-center gap-2 border-l border-[var(--border)] pl-4">
        <Calendar className="h-4 w-4 text-[var(--foreground-muted)]" strokeWidth={1.75} />
        <div className="text-right leading-tight">
          <p className="text-sm font-medium text-[var(--foreground)]">{today.label}</p>
          <p className="text-xs text-[var(--foreground-muted)]">{today.weekday}</p>
        </div>
      </div>
    </header>
  );
}
