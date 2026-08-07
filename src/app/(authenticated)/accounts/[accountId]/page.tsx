import { notFound } from "next/navigation";

import { getAccountDetailPageData } from "@/composition/accounts-query";
import { requireAuthenticatedUser } from "@/lib/auth/authenticated-user";
import { AccountDetailHeader } from "@/features/accounts/components/account-detail-header";
import { AccountDetailTabs } from "@/features/accounts/components/account-detail-tabs";

export const dynamic = "force-dynamic";

export default async function AccountDetailPage({ params }: { params: Promise<{ accountId: string }> }) {
  const { accountId } = await params;
  const authUser = await requireAuthenticatedUser();

  // Single call, single flat query batch inside it — see the comment on
  // getAccountDetailPageData for why this must not be two separate
  // composed functions combined via an outer Promise.all here.
  const { detail, institutions } = await getAccountDetailPageData(authUser.id, accountId);

  // A missing account and another owner's account resolve identically —
  // never confirming which case applied, matching the Server Action layer
  // (src/features/accounts/actions.ts) and the rest of this codebase's
  // cross-owner response convention.
  if (!detail) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <AccountDetailHeader
        account={detail.account}
        institutionName={detail.institutionName}
        displayGroup={detail.displayGroup}
        displayLabel={detail.displayLabel}
      />

      <AccountDetailTabs
        account={detail.account}
        institutionName={detail.institutionName}
        displayLabel={detail.displayLabel}
        activity={detail.activity}
        institutions={institutions}
      />
    </div>
  );
}
