import type { ReactNode } from "react";

// A static, decorative tab strip matching the mockup shell — not a router
// or a content filter. "Overview" is the only real view this page has;
// the other four tabs are disabled (dedicated Active/Completed/Rewards/
// History views aren't built) rather than silently doing nothing on
// click, which would look broken instead of honestly not-yet-available.
// The real Active/Available/Completed sections underneath render exactly
// the same regardless of which tab is "selected" — this never gates or
// hides any of that real content.
//
// Nested inside the left column only (missions/page.tsx), which sits in
// the same items-start grid row as the right rail — the rail's own
// position (Daily Mission's top) is never touched by this component. The
// -35px top margin pulls this strip up so its own bottom border lines up
// exactly with that unmoved rail top and tightens the gap under the page
// title in the same move; -35px is the strip's own measured height
// (line-height + pb-3 + border), confirmed via getBoundingClientRect
// (tab bottom === Daily Mission card top, both at the same viewport Y).
const DISABLED_TABS = ["Active", "Completed", "Rewards", "History"] as const;

export function MissionsTabs({ children }: { children: ReactNode }) {
  return (
    <div>
      <div className="-mt-[35px] flex items-center gap-6 border-b border-[var(--border)]">
        <span className="border-b-2 border-[var(--primary)] px-1 pb-3 text-sm font-medium text-[var(--foreground)]">
          Overview
        </span>
        {DISABLED_TABS.map((tab) => (
          <span
            key={tab}
            title="Not available yet"
            className="cursor-not-allowed px-1 pb-3 text-sm font-medium text-[var(--foreground-muted)] opacity-60"
          >
            {tab}
          </span>
        ))}
      </div>

      <div className="mt-6">{children}</div>
    </div>
  );
}
