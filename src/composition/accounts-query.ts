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
import type { Institution } from "@/domains/institutions/types";
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

// Both page-data functions below fetch the *entire* institutions list in
// one query (institutions are few and shared, not owner-scoped — see
// src/db/schema/institutions.ts) rather than looking up individual ids —
// partly to keep this module's queries in one place, but the load-bearing
// reason is the LIMIT rule below.
//
// CONFIRMED ROOT CAUSE (reproduced with controlled experiments — see
// accounts-query.test.ts's "concurrent LIMIT query" block): with the db
// client's pool held to a single connection, running a query that has a
// LIMIT clause (e.g. AccountRepository.getByIdForOwner's `.limit(1)`)
// concurrently with 2+ sibling queries via Promise.all reliably wedges
// that connection indefinitely — reproduced 100% of the time, including
// as the very first query in a fresh process, regardless of which
// unrelated tables the sibling queries touch. Separately, even fully
// sequential/LIMIT-free query batches (this codebase's own established
// "good" pattern — DashboardService's Promise.all) showed non-trivial
// intermittent hangs under repeated reuse of a single connection across
// requests. Both symptoms disappeared in every trial once the pool was
// given more than one connection to spread concurrent statements across
// (see src/db/client.ts) — consistent with a postgres.js 3.4.9 /
// single-connection interaction with Postgres's portal-suspend ("execute
// with max rows") wire-protocol path when pipelined against other
// concurrent statements on the *same* connection.
//
// The pool-size increase is the fix for the general/intermittent form of
// this issue. This module additionally follows a stricter rule so the
// *deterministic* form (LIMIT run concurrently with siblings) can never
// happen here even under connection pressure: getByIdForOwner is always
// awaited alone, never inside the same Promise.all as another query.
function buildInstitutionNameMap(institutionRows: Institution[]): Map<string, string> {
  return new Map(institutionRows.map((institution) => [institution.id, institution.name]));
}

function toInstitutionOptions(institutionRows: Institution[]): InstitutionOption[] {
  return institutionRows
    .map((institution) => ({ id: institution.id, name: institution.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// For the "Add account" / "Edit account" institution picker, when nothing
// else on the page also needs a concurrent DB read. Not owner-scoped —
// institutions are shared reference data, not owned records. Do not call
// this via Promise.all alongside another composed query function in this
// module (see the comment above) — use getAccountsPageData /
// getAccountDetailPageData instead, which fetch institutions as part of
// their own single flat batch.
export async function listInstitutionOptions(): Promise<InstitutionOption[]> {
  const institutionRows = await institutionRepository.list();
  return toInstitutionOptions(institutionRows);
}

export interface AccountsPageData {
  listView: AccountsListView;
  institutions: InstitutionOption[];
}

// Everything the Accounts index page needs, from one flat query batch.
export async function getAccountsPageData(ownerId: string): Promise<AccountsPageData> {
  const [accounts, institutionRows] = await Promise.all([
    accountRepository.listForOwner(ownerId, "active"),
    institutionRepository.list(),
  ]);

  const institutionNameById = buildInstitutionNameMap(institutionRows);

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

  return {
    listView: { rows, groupOrder: GROUP_ORDER, groups, summary: summarizeAccounts(accounts) },
    institutions: toInstitutionOptions(institutionRows),
  };
}

export interface AccountDetailPageData {
  // null when the account doesn't exist or isn't owned by this caller —
  // getByIdForOwner already can't distinguish those cases, and the route
  // calls Next's notFound() either way, never confirming which one
  // applied. institutions is still populated in this case (the edit form
  // needs it even on a fresh "add" attempt from a 404'd page).
  detail: AccountDetailView | null;
  institutions: InstitutionOption[];
}

// Everything the Account Detail page needs. accountRepository's lookup
// carries a LIMIT clause internally (fetches at most one row by id), so it
// is always awaited alone, never inside the same Promise.all as the other
// three reads — see the module comment above for why. Institutions/
// transactions/categories carry no LIMIT and are safe to batch together
// once the account lookup has resolved.
export async function getAccountDetailPageData(
  ownerId: string,
  accountId: string,
  options: { activityLimit?: number } = {},
): Promise<AccountDetailPageData> {
  const activityLimit = options.activityLimit ?? 50;

  const account = await accountRepository.getByIdForOwner(accountId, ownerId);

  const [institutionRows, transactions, categories] = await Promise.all([
    institutionRepository.list(),
    transactionRepository.listForOwner(ownerId, { accountId, includeExcluded: true }),
    categoryRepository.listForOwner(ownerId),
  ]);

  const institutions = toInstitutionOptions(institutionRows);

  if (!account) {
    return { detail: null, institutions };
  }

  const institutionNameById = buildInstitutionNameMap(institutionRows);
  const presentation = getAccountPresentation(account.accountType);
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
    detail: {
      account,
      institutionName: account.institutionId ? (institutionNameById.get(account.institutionId) ?? null) : null,
      displayGroup: presentation.group,
      displayLabel: presentation.label,
      activity,
    },
    institutions,
  };
}
