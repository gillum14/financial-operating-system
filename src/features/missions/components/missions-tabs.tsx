"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

// Overview and Rewards are the two real views this page has; the other
// three tabs stay disabled (dedicated Active/Completed/History views
// aren't built) rather than silently doing nothing on click, which would
// look broken instead of honestly not-yet-available. Switching between
// Overview/Rewards never gates or hides the real Active/Available/
// Completed sections underneath — those still render unconditionally
// inside whichever panel owns them.
//
// Nested inside the left column only (missions/page.tsx), which sits in
// the same items-start grid row as the right rail — the rail's own
// position (Daily Mission's top) is never touched by this component. The
// -35px top margin pulls this strip up so its own bottom border lines up
// exactly with that unmoved rail top and tightens the gap under the page
// title in the same move; -35px is the strip's own measured height
// (line-height + pb-3 + border), confirmed via getBoundingClientRect
// (tab bottom === Daily Mission card top, both at the same viewport Y).
// That measurement assumed a bordered tab button, so both real tabs below
// keep an always-present `border-b-2` (transparent when unselected) to
// preserve the exact height this offset was measured against.
export type MissionsTabKey = "overview" | "rewards";

interface MissionsTabsContextValue {
  activeTab: MissionsTabKey;
  setActiveTab: (tab: MissionsTabKey) => void;
}

const MissionsTabsContext = createContext<MissionsTabsContextValue | null>(null);

// Lets a component nested inside either panel (e.g. the Rewards Earned
// summary tile, which lives in the Overview panel) switch tabs without
// MissionsTabs needing to know that tile exists — the same
// context-for-cross-panel-control shape as any other provider/consumer
// pair in this codebase, scoped tightly to just this one tab strip.
export function useMissionsTabs(): MissionsTabsContextValue {
  const ctx = useContext(MissionsTabsContext);
  if (!ctx) {
    throw new Error("useMissionsTabs must be used within <MissionsTabs>");
  }
  return ctx;
}

const DISABLED_TABS = ["Active", "Completed", "History"] as const;

function tabButtonClassName(isActive: boolean): string {
  return `border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
    isActive
      ? "border-[var(--primary)] text-[var(--foreground)]"
      : "border-transparent text-[var(--foreground-muted)] hover:text-[var(--foreground-secondary)]"
  }`;
}

export function MissionsTabs({ overviewPanel, rewardsPanel }: { overviewPanel: ReactNode; rewardsPanel: ReactNode }) {
  const [activeTab, setActiveTab] = useState<MissionsTabKey>("overview");

  return (
    <MissionsTabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div>
        <div className="-mt-[35px] flex items-center gap-6 border-b border-[var(--border)]">
          <button type="button" onClick={() => setActiveTab("overview")} className={tabButtonClassName(activeTab === "overview")}>
            Overview
          </button>
          <button type="button" onClick={() => setActiveTab("rewards")} className={tabButtonClassName(activeTab === "rewards")}>
            Rewards
          </button>
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

        <div className="mt-6">{activeTab === "overview" ? overviewPanel : rewardsPanel}</div>
      </div>
    </MissionsTabsContext.Provider>
  );
}
