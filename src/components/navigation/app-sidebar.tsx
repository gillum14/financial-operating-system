"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bell,
  Calendar,
  ChevronsUpDown,
  CreditCard,
  FileText,
  Folder,
  LayoutDashboard,
  Plug,
  Repeat,
  Settings,
  Tag,
  Target,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import type { CurrentUser } from "@/lib/session";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
  disabled?: boolean;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    label: "Mission Control",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Transactions", href: "/transactions", icon: Activity, disabled: true },
      { label: "Budgets", href: "/budgets", icon: Wallet, disabled: true },
      { label: "Accounts", href: "/accounts", icon: CreditCard, disabled: true },
      { label: "Reports", href: "/reports", icon: FileText, disabled: true },
      { label: "Goals", href: "/goals", icon: Target, disabled: true },
      { label: "Investments", href: "/investments", icon: TrendingUp, disabled: true },
      { label: "Net Worth", href: "/net-worth", icon: Activity, disabled: true },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Alerts", href: "/alerts", icon: Bell, badge: 3, disabled: true },
      { label: "Recurring", href: "/recurring", icon: Repeat, disabled: true },
      { label: "Scheduled", href: "/scheduled", icon: Calendar, disabled: true },
    ],
  },
  {
    label: "Configuration",
    items: [
      { label: "Settings", href: "/settings", icon: Settings, disabled: true },
      { label: "Integrations", href: "/integrations", icon: Plug, disabled: true },
      { label: "Categories", href: "/categories", icon: Folder, disabled: true },
      { label: "Tags", href: "/tags", icon: Tag, disabled: true },
    ],
  },
];

function OwlMark() {
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8 shrink-0 text-[var(--primary)]" fill="none" aria-hidden="true">
      <path
        d="M16 3c-6.075 0-11 4.925-11 11 0 5.02 2.5 8.146 4.5 10.5.53.62 1.4.73 2.06.27L16 21.5l4.44 3.27c.66.46 1.53.35 2.06-.27C24.5 22.146 27 19.02 27 14c0-6.075-4.925-11-11-11Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="11.5" cy="14" r="2.5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="20.5" cy="14" r="2.5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="11.5" cy="14" r="0.6" fill="currentColor" />
      <circle cx="20.5" cy="14" r="0.6" fill="currentColor" />
      <path d="M16 15.5 14.6 18h2.8L16 15.5Z" fill="currentColor" />
      <path d="M9 9.5 12 7M23 9.5 20 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function isRouteActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebar({ user }: { user: CurrentUser }) {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)]">
      <div className="flex items-center gap-3 border-b border-[var(--border)] px-6 py-5">
        <OwlMark />
        <div>
          <p className="text-lg leading-tight font-semibold tracking-[0.08em] text-[var(--foreground)]">
            ATHENA
          </p>
          <p className="text-[10px] leading-tight font-medium tracking-[0.12em] text-[var(--foreground-muted)] uppercase">
            Financial Operating System
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-6">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="px-2 text-[11px] font-semibold tracking-[0.14em] text-[var(--foreground-muted)] uppercase">
              {group.label}
            </p>

            <div className="mt-2 space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;

                if (item.disabled) {
                  return (
                    <span
                      key={item.href}
                      aria-disabled="true"
                      className="flex cursor-not-allowed items-center gap-3 rounded-[calc(var(--radius)-6px)] px-3 py-2 text-sm font-medium text-[var(--foreground-muted)] opacity-50"
                    >
                      <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                      <span className="flex-1">{item.label}</span>
                      {item.badge !== undefined && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--foreground-muted)]/30 px-1.5 text-[11px] font-semibold text-[var(--foreground-muted)]">
                          {item.badge}
                        </span>
                      )}
                    </span>
                  );
                }

                const isActive = isRouteActive(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative flex items-center gap-3 rounded-[calc(var(--radius)-6px)] px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-[var(--surface-hover)] text-[var(--foreground)]"
                        : "text-[var(--foreground-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    {isActive && (
                      <span className="absolute top-1 bottom-1 -left-4 w-0.5 rounded-full bg-[var(--primary)]" />
                    )}
                    <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                    <span className="flex-1">{item.label}</span>
                    {item.badge !== undefined && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--primary)] px-1.5 text-[11px] font-semibold text-white">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <button
        type="button"
        className="flex items-center gap-3 border-t border-[var(--border)] px-6 py-4 text-left transition-colors hover:bg-[var(--surface-hover)]"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/15 text-xs font-semibold text-[var(--primary)]">
          {user.initials}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-[var(--foreground)]">{user.name}</span>
          <span className="block truncate text-xs text-[var(--foreground-muted)]">{user.role}</span>
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-[var(--foreground-muted)]" strokeWidth={1.75} />
      </button>
    </aside>
  );
}
