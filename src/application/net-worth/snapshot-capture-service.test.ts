import { randomUUID } from "node:crypto";

import { beforeEach, describe, expect, it } from "vitest";

import { FakeAccountBalanceSnapshotRepository, FakeAccountRepository } from "@/application/test-support/repository-fakes";

import { SnapshotCaptureService } from "./snapshot-capture-service";

describe("SnapshotCaptureService", () => {
  let accountRepository: FakeAccountRepository;
  let snapshotRepository: FakeAccountBalanceSnapshotRepository;
  let service: SnapshotCaptureService;
  let ownerId: string;

  beforeEach(() => {
    accountRepository = new FakeAccountRepository();
    snapshotRepository = new FakeAccountBalanceSnapshotRepository();
    service = new SnapshotCaptureService(snapshotRepository, accountRepository);
    ownerId = randomUUID();
  });

  it("captures one snapshot per active account, carrying its current balance and classification", async () => {
    await accountRepository.create({
      ownerId,
      name: "Checking",
      accountType: "checking",
      balanceSource: "manual",
      currentBalance: "1500.00",
    });
    await accountRepository.create({
      ownerId,
      name: "Credit Card",
      accountType: "credit-card",
      balanceSource: "computed",
      currentBalance: "-200.00",
    });

    const snapshots = await service.captureSnapshot(ownerId, "2026-01-31", "monthly");

    expect(snapshots).toHaveLength(2);
    const checking = snapshots.find((s) => s.accountType === "checking");
    expect(checking).toMatchObject({
      ownerId,
      snapshotDate: "2026-01-31",
      balance: "1500.00",
      accountType: "checking",
      balanceSource: "manual",
      snapshotType: "monthly",
    });
  });

  it("is idempotent: a second capture for the same owner and date captures nothing new", async () => {
    await accountRepository.create({ ownerId, name: "Checking", accountType: "checking", currentBalance: "1500.00" });

    const first = await service.captureSnapshot(ownerId, "2026-01-31", "monthly");
    const second = await service.captureSnapshot(ownerId, "2026-01-31", "monthly");

    expect(first).toHaveLength(1);
    expect(second).toHaveLength(0);

    const stored = await snapshotRepository.listForOwner(ownerId);
    expect(stored).toHaveLength(1);
  });

  it("allows a second capture for a different date to succeed normally", async () => {
    await accountRepository.create({ ownerId, name: "Checking", accountType: "checking", currentBalance: "1500.00" });

    await service.captureSnapshot(ownerId, "2026-01-31", "monthly");
    const february = await service.captureSnapshot(ownerId, "2026-02-28", "monthly");

    expect(february).toHaveLength(1);
    expect(await snapshotRepository.listForOwner(ownerId)).toHaveLength(2);
  });

  it("only captures active accounts, never archived ones", async () => {
    const archived = await accountRepository.create({
      ownerId,
      name: "Old Account",
      accountType: "checking",
      currentBalance: "100.00",
    });
    await accountRepository.archive(archived.id, ownerId);
    await accountRepository.create({ ownerId, name: "Active", accountType: "checking", currentBalance: "500.00" });

    const snapshots = await service.captureSnapshot(ownerId, "2026-01-31", "monthly");

    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].balance).toBe("500.00");
  });

  it("is owner-scoped: never captures another owner's accounts", async () => {
    const otherOwnerId = randomUUID();
    await accountRepository.create({ ownerId: otherOwnerId, name: "Other", accountType: "checking", currentBalance: "999.00" });

    const snapshots = await service.captureSnapshot(ownerId, "2026-01-31", "monthly");

    expect(snapshots).toHaveLength(0);
  });

  it("captures nothing (not an error) when the owner has no accounts", async () => {
    await expect(service.captureSnapshot(ownerId, "2026-01-31", "monthly")).resolves.toEqual([]);
  });

  it("treats a null currentBalance as zero rather than skipping the account", async () => {
    await accountRepository.create({ ownerId, name: "No Balance", accountType: "checking", currentBalance: null });

    const snapshots = await service.captureSnapshot(ownerId, "2026-01-31", "monthly");

    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].balance).toBe("0.0000");
  });

  it("captureMonthlySnapshot snapshots the last day of the month before asOf's month", async () => {
    await accountRepository.create({ ownerId, name: "Checking", accountType: "checking", currentBalance: "1000.00" });

    const snapshots = await service.captureMonthlySnapshot(ownerId, new Date("2026-08-04T00:00:00Z"));

    expect(snapshots[0].snapshotDate).toBe("2026-07-31");
    expect(snapshots[0].snapshotType).toBe("monthly");
  });

  it("captureManualSnapshot snapshots asOf's own date directly", async () => {
    await accountRepository.create({ ownerId, name: "Checking", accountType: "checking", currentBalance: "1000.00" });

    const snapshots = await service.captureManualSnapshot(ownerId, new Date("2026-08-04T00:00:00Z"));

    expect(snapshots[0].snapshotDate).toBe("2026-08-04");
    expect(snapshots[0].snapshotType).toBe("manual");
  });
});
