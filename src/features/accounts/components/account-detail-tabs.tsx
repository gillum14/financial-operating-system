"use client";

import { useState } from "react";

import type { Account } from "@/domains/accounts/types";
import type { AccountActivityItem, InstitutionOption } from "@/application/accounts/accounts-views";

import { AccountHealthCard } from "./account-health-card";
import { AccountInformationCard } from "./account-information-card";
import { AccountLifecycleCard } from "./account-lifecycle-card";
import { AccountTransactionsTable } from "./account-transactions-table";
import { BalanceHistoryCard } from "./balance-history-card";
import { EditAccountForm } from "./edit-account-form";
import { RecentActivityCard } from "./recent-activity-card";

const TABS = ["Overview", "Transactions", "Information", "Settings"] as const;
type Tab = (typeof TABS)[number];

export function AccountDetailTabs({
  account,
  institutionName,
  displayLabel,
  activity,
  institutions,
}: {
  account: Account;
  institutionName: string | null;
  displayLabel: string;
  activity: AccountActivityItem[];
  institutions: InstitutionOption[];
}) {
  const [activeTab, setActiveTab] = useState<Tab>("Overview");

  return (
    <div>
      <div role="tablist" aria-label="Account sections" className="flex gap-6 border-b border-[var(--border)]">
        {TABS.map((tab) => {
          const isActive = tab === activeTab;
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              id={`account-tab-${tab.toLowerCase()}`}
              aria-selected={isActive}
              aria-controls={`account-tabpanel-${tab.toLowerCase()}`}
              onClick={() => setActiveTab(tab)}
              className={`relative -mb-px border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? "border-[var(--primary)] text-[var(--foreground)]"
                  : "border-transparent text-[var(--foreground-muted)] hover:text-[var(--foreground-secondary)]"
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id="account-tabpanel-overview"
        aria-labelledby="account-tab-overview"
        hidden={activeTab !== "Overview"}
        className="pt-6"
      >
        {activeTab === "Overview" && (
          <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
            <div className="space-y-6">
              <BalanceHistoryCard />
              <AccountInformationCard account={account} institutionName={institutionName} displayLabel={displayLabel} />
            </div>
            <div className="space-y-6">
              <RecentActivityCard activity={activity} onViewAll={() => setActiveTab("Transactions")} />
              <AccountHealthCard />
            </div>
          </div>
        )}
      </div>

      <div
        role="tabpanel"
        id="account-tabpanel-transactions"
        aria-labelledby="account-tab-transactions"
        hidden={activeTab !== "Transactions"}
        className="pt-6"
      >
        {activeTab === "Transactions" && <AccountTransactionsTable activity={activity} />}
      </div>

      <div
        role="tabpanel"
        id="account-tabpanel-information"
        aria-labelledby="account-tab-information"
        hidden={activeTab !== "Information"}
        className="pt-6"
      >
        {activeTab === "Information" && (
          <div className="max-w-xl">
            <AccountInformationCard account={account} institutionName={institutionName} displayLabel={displayLabel} />
          </div>
        )}
      </div>

      <div
        role="tabpanel"
        id="account-tabpanel-settings"
        aria-labelledby="account-tab-settings"
        hidden={activeTab !== "Settings"}
        className="pt-6"
      >
        {activeTab === "Settings" && (
          <div className="max-w-xl space-y-6">
            <EditAccountForm account={account} institutions={institutions} />
            <AccountLifecycleCard accountId={account.id} status={account.status} />
          </div>
        )}
      </div>
    </div>
  );
}
