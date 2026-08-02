import "server-only";

import { summarizeAccounts } from "@/application/accounts/accounts-summary";
import type {
  AccountActivityItem,
  AccountDetailView,
  AccountListRow,
  AccountsListView,
  InstitutionOption,
} from "@/application/accounts/accounts-views";
import { getAccountPresentation } from "@/application/dashboard/account-presentation";
import type { AccountDisplayGroup } from "@/application/dashboard/account-presentation";
import { db } from "@/db/client";
import type { Account } from "@/domains/accounts/types";
import { DrizzleAccountRepository } from "@/infrastructure/db/accounts-repository";
import { DrizzleCategoryRepository } from "@/infrastructure/db/categories-repository";
import { DrizzleInstitutionRepository } from "@/infrastructure/db/institutions-repository";
import { DrizzleTransactionRepository } from "@/infrastructure/db/transactions-repository";

export type {
  AccountActivityItem,
  AccountDetailView,
  AccountListRow,
  AccountsListView,
  InstitutionOption,
} from "@/application/accounts/accounts-views";

// Server-only query orchestration for the Accounts workspace — the same
// role dashboard-query.ts plays for the dashboard: combine repository/
// service reads into presentation-ready shapes, with no JSX and no
// try/catch (errors propagate to the route's error boundary). The view
// types themselves live in src/application/accounts/accounts-views.ts
// (re-exported above for convenience), not here, so "use client"
// components can import the types without importing this server-only
// module — see architecture-boundaries.test.ts.

const accountRepository = new DrizzleAccountRepository(db);
const institutionRepository = new DrizzleInstitutionRepository(db);
const transactionRepository = new DrizzleTransactionRepository(db);
const categoryRepository = new DrizzleCategoryRepository(db);

const GROUP_ORDER: AccountDisplayGroup[] = ["Cash", "Credit", "Loans", "Investments", "Assets"];

async function resolveInstitutionNames(accounts: Account[]): Promise<Map<string, string>> {
  const institutionIds = [...new Set(accounts.map((a) => a.institutionId).filter((id): id is string => Boolean(id)))];
  const entries = await Promise.all(
    institutionIds.map(async (id) => [id, (await institutionRepository.getById(id))?.name ?? null] as const),
  );
  return new Map(entries.filter((entry): entry is [string, string] => entry[1] !== null));
}

// For the "Add account" / "Edit account" institution picker. Not
// owner-scoped — institutions are shared reference data, not owned
// records (see src/db/schema/institutions.ts).
export async function listInstitutionOptions(): Promise<InstitutionOption[]> {
  const institutions = await institutionRepository.list();
  return institutions
    .map((institution) => ({ id: institution.id, name: institution.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getAccountsListView(ownerId: string): Promise<AccountsListView> {
  const accounts = await accountRepository.listForOwner(ownerId, "active");
  const institutionNameById = await resolveInstitutionNames(accounts);

  const rows: AccountListRow[] = accounts.map((account) => {
    const presentation = getAccountPresentation(account.accountType);
    return {
      account,
      institutionName: account.institutionId ? (institutionNameById.get(account.institutionId) ?? null) : null,
      displayGroup: presentation.group,
      displayLabel: presentation.label,
    };
  });

  const groups: Partial<Record<AccountDisplayGroup, AccountListRow[]>> = {};
  for (const row of rows) {
    (groups[row.displayGroup] ??= []).push(row);
  }

  return { rows, groupOrder: GROUP_ORDER, groups, summary: summarizeAccounts(accounts) };
}

// Returns null (never throws) when the account doesn't exist or isn't
// owned by this caller — getByIdForOwner already can't distinguish those
// cases, and the route calls Next's notFound() either way, never
// confirming which one applied.
export async function getAccountDetailView(
  ownerId: string,
  accountId: string,
  options: { activityLimit?: number } = {},
): Promise<AccountDetailView | null> {
  const account = await accountRepository.getByIdForOwner(accountId, ownerId);
  if (!account) return null;

  const activityLimit = options.activityLimit ?? 50;
  const presentation = getAccountPresentation(account.accountType);

  const [institution, transactions, categories] = await Promise.all([
    account.institutionId ? institutionRepository.getById(account.institutionId) : Promise.resolve(null),
    transactionRepository.listForOwner(ownerId, { accountId, includeExcluded: true }),
    categoryRepository.listForOwner(ownerId),
  ]);

  const categoryById = new Map(categories.map((category) => [category.id, category]));

  // Bounded (not paginated) on purpose — the Transactions tab is a
  // per-account view within Account Detail, not the full ledger (the
  // dedicated Transactions page is explicitly out of scope for this
  // slice). TECH DEBT: an account with more than `activityLimit` history
  // will silently show only the most recent ones; real pagination belongs
  // with the Transactions-page slice.
  const activity: AccountActivityItem[] = [...transactions]
    .sort((a, b) => (a.transactionDate < b.transactionDate ? 1 : -1))
    .slice(0, activityLimit)
    .map((transaction) => {
      let categoryName: string | null = null;
      if (transaction.categoryId) {
        const category = categoryById.get(transaction.categoryId);
        if (category) {
          const parent = category.parentCategoryId ? categoryById.get(category.parentCategoryId) : null;
          categoryName = parent ? parent.name : category.name;
        }
      }
      return {
        id: transaction.id,
        merchant: transaction.merchant ?? transaction.originalDescription,
        categoryName,
        amount: Number(transaction.amount),
        transactionDate: transaction.transactionDate,
      };
    });

  return {
    account,
    institutionName: institution?.name ?? null,
    displayGroup: presentation.group,
    displayLabel: presentation.label,
    activity,
  };
}
