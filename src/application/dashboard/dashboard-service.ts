import type { Account } from "@/domains/accounts/types";
import type { AccountRepository } from "@/domains/accounts/repository";
import type { CategoryRepository } from "@/domains/categories/repository";
import type { InstitutionRepository } from "@/domains/institutions/repository";
import type { TransactionRepository } from "@/domains/transactions/repository";
import type { Transaction } from "@/domains/transactions/types";

export interface AccountWithInstitution {
  account: Account;
  institutionName: string | null;
}

export interface CategoryTotal {
  categoryName: string;
  totalAmount: number;
}

export interface CashFlowByDate {
  date: string;
  income: number;
  expenses: number;
}

export interface TransactionWithCategoryName {
  transaction: Transaction;
  categoryName: string | null;
}

export interface DashboardRawData {
  accounts: AccountWithInstitution[];
  recentTransactions: TransactionWithCategoryName[];
  categoryTotals: CategoryTotal[];
  cashFlowByDate: CashFlowByDate[];
  netWorth: number;
  investmentsTotal: number;
  monthlyCashFlow: number;
  periodLabel: string;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Read-oriented aggregation for the dashboard. Depends on repository
// interfaces directly rather than the Slice 6 write-oriented services —
// there's no create/update validation or cross-entity business rule to
// enforce here, only querying and computation.
export class DashboardService {
  constructor(
    private readonly accountRepository: AccountRepository,
    private readonly institutionRepository: InstitutionRepository,
    private readonly transactionRepository: TransactionRepository,
    private readonly categoryRepository: CategoryRepository,
  ) {}

  async getDashboardData(
    ownerId: string,
    options: { recentActivityLimit?: number; periodDays?: number } = {},
  ): Promise<DashboardRawData> {
    const recentActivityLimit = options.recentActivityLimit ?? 10;
    const periodDays = options.periodDays ?? 30;

    const periodEnd = new Date();
    const periodStart = new Date(periodEnd);
    periodStart.setDate(periodStart.getDate() - periodDays);
    const dateFrom = formatDate(periodStart);
    const dateTo = formatDate(periodEnd);

    const [accounts, categories, periodTransactions, allTransactions] = await Promise.all([
      this.accountRepository.listForOwner(ownerId),
      this.categoryRepository.listForOwner(ownerId),
      this.transactionRepository.listForOwner(ownerId, { dateFrom, dateTo }),
      this.transactionRepository.listForOwner(ownerId),
    ]);

    const institutionIds = [
      ...new Set(accounts.map((account) => account.institutionId).filter((id): id is string => Boolean(id))),
    ];
    const institutionEntries = await Promise.all(
      institutionIds.map(async (id) => [id, await this.institutionRepository.getById(id)] as const),
    );
    const institutionById = new Map(institutionEntries);

    const accountsWithInstitutions: AccountWithInstitution[] = accounts.map((account) => ({
      account,
      institutionName: account.institutionId
        ? (institutionById.get(account.institutionId)?.name ?? null)
        : null,
    }));

    const categoryById = new Map(categories.map((category) => [category.id, category]));

    // Recent activity looks at full history, not just the aggregation
    // period — the latest transactions should show up even if the period
    // window used for cash-flow/spending totals is narrower. Category name
    // here is the transaction's own category (not rolled up to parent) —
    // rollup is only for the spending-by-category summary below.
    const recentTransactions: TransactionWithCategoryName[] = [...allTransactions]
      .sort((a, b) => (a.transactionDate < b.transactionDate ? 1 : -1))
      .slice(0, recentActivityLimit)
      .map((transaction) => ({
        transaction,
        categoryName: transaction.categoryId ? (categoryById.get(transaction.categoryId)?.name ?? null) : null,
      }));

    const categoryTotalsMap = new Map<string, number>();
    const cashFlowByDateMap = new Map<string, { income: number; expenses: number }>();
    let monthlyCashFlow = 0;

    for (const transaction of periodTransactions) {
      const amount = Number(transaction.amount);

      if (transaction.transactionType !== "transfer") {
        monthlyCashFlow += amount;

        const bucket = cashFlowByDateMap.get(transaction.transactionDate) ?? { income: 0, expenses: 0 };
        if (transaction.transactionType === "income") {
          bucket.income += amount;
        } else {
          bucket.expenses += Math.abs(amount);
        }
        cashFlowByDateMap.set(transaction.transactionDate, bucket);
      }

      if (transaction.transactionType === "expense") {
        let displayName = "Uncategorized";
        if (transaction.categoryId) {
          const category = categoryById.get(transaction.categoryId);
          if (category) {
            const parent = category.parentCategoryId ? categoryById.get(category.parentCategoryId) : null;
            displayName = parent ? parent.name : category.name;
          }
        }
        categoryTotalsMap.set(displayName, (categoryTotalsMap.get(displayName) ?? 0) + Math.abs(amount));
      }
    }

    // Net worth / investments assume liability-type account balances are
    // stored negative (the Slice 3 seed-data convention) — nothing in the
    // schema enforces this, it's a documented assumption, not a guarantee.
    const netWorth = accounts.reduce(
      (sum, account) => sum + (account.currentBalance ? Number(account.currentBalance) : 0),
      0,
    );
    const investmentsTotal = accounts
      .filter((account) => account.accountType === "investment" || account.accountType === "retirement")
      .reduce((sum, account) => sum + (account.currentBalance ? Number(account.currentBalance) : 0), 0);

    return {
      accounts: accountsWithInstitutions,
      recentTransactions,
      categoryTotals: [...categoryTotalsMap.entries()]
        .map(([categoryName, totalAmount]) => ({ categoryName, totalAmount }))
        .sort((a, b) => b.totalAmount - a.totalAmount),
      cashFlowByDate: [...cashFlowByDateMap.entries()]
        .map(([date, values]) => ({ date, ...values }))
        .sort((a, b) => (a.date < b.date ? -1 : 1)),
      netWorth,
      investmentsTotal,
      monthlyCashFlow,
      periodLabel: `${dateFrom} – ${dateTo}`,
    };
  }
}
