"use client";

import { Search } from "lucide-react";

export function CategoriesSearch({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="relative max-w-sm">
      <Search
        className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--foreground-muted)]"
        strokeWidth={1.75}
      />
      <label htmlFor="categories-search" className="sr-only">
        Search categories and subcategories
      </label>
      <input
        id="categories-search"
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search categories…"
        className="w-full rounded-[calc(var(--radius)-8px)] border border-[var(--border)] bg-[var(--background)] py-2 pr-3 pl-9 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:border-[var(--primary)] focus:outline-none"
      />
    </div>
  );
}
