import type { AccountRepository } from "@/domains/accounts/repository";
import type { AccountBalanceSnapshotRepository } from "@/domains/net-worth-history/repository";
import type {
  AccountBalanceSnapshot,
  AccountBalanceSnapshotCreateInput,
  AccountBalanceSnapshotType,
} from "@/domains/net-worth-history/types";

import { lastDayOfPreviousMonth, toDateOnlyString } from "./net-worth-history-calculations";

// Real capture path (task §5) — no scheduler/background-job
// infrastructure exists in this codebase yet, so nothing here invents
// one. captureMonthlySnapshot/captureManualSnapshot are the two entry
// points a future scheduled job or an explicit dev/verification action
// would call; until a scheduler exists, the only caller is the manual
// capture Server Action (see features/net-worth/actions.ts), which is
// deliberately NOT an arbitrary balance-writing UI — it captures whatever
// the owner's real account balances already are, on-demand, nothing more.
//
// FUTURE WORK (documented, not built): a scheduled job should call
// captureMonthlySnapshot() for every owner once per month, after each
// month closes. No such scheduler exists yet.
export class SnapshotCaptureService {
  constructor(
    private readonly snapshotRepository: AccountBalanceSnapshotRepository,
    private readonly accountRepository: AccountRepository,
  ) {}

  // The idempotent low-level primitive every capture entry point delegates
  // to. Snapshots every active account's CURRENT balance for this owner,
  // denormalizing the classification metadata needed to reconstruct Net
  // Worth later without depending on the live account row. A second call
  // for the same (owner, date) captures nothing new (see the repository's
  // ON CONFLICT DO NOTHING) — safe to call redundantly, e.g. from a retried
  // job or a re-submitted form.
  async captureSnapshot(
    ownerId: string,
    snapshotDate: string,
    snapshotType: AccountBalanceSnapshotType,
  ): Promise<AccountBalanceSnapshot[]> {
    const accounts = await this.accountRepository.listForOwner(ownerId, "active");
    if (accounts.length === 0) return [];

    const inputs: AccountBalanceSnapshotCreateInput[] = accounts.map((account) => ({
      ownerId,
      accountId: account.id,
      snapshotDate,
      balance: account.currentBalance ?? "0.0000",
      accountType: account.accountType,
      balanceSource: account.balanceSource,
      snapshotType,
    }));

    return this.snapshotRepository.createMany(inputs);
  }

  // Deterministic monthly boundary: always the last day of the most
  // recently completed calendar month relative to asOf, never the
  // in-progress month — "monthly official snapshots" per the approved
  // snapshot rules, not "whatever day this happened to run."
  async captureMonthlySnapshot(ownerId: string, asOf: Date = new Date()): Promise<AccountBalanceSnapshot[]> {
    return this.captureSnapshot(ownerId, lastDayOfPreviousMonth(asOf), "monthly");
  }

  // Material-event / dev-verification capture: snapshots today's (or an
  // explicit asOf's) balances directly, not a month boundary.
  async captureManualSnapshot(ownerId: string, asOf: Date = new Date()): Promise<AccountBalanceSnapshot[]> {
    return this.captureSnapshot(ownerId, toDateOnlyString(asOf), "manual");
  }
}
