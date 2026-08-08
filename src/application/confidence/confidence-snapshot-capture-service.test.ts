import { randomUUID } from "node:crypto";

import { beforeEach, describe, expect, it } from "vitest";

import { FakeConfidenceScoreSnapshotRepository } from "@/application/test-support/repository-fakes";

import type { ConfidenceResult } from "./confidence-calculations";
import { ConfidenceSnapshotCaptureService } from "./confidence-snapshot-capture-service";

function makeResult(overallScore: number | null): ConfidenceResult {
  return {
    asOf: new Date("2026-08-07T00:00:00Z"),
    overallScore,
    band: overallScore === null ? null : { id: "stable", label: "Stable" },
    pillars: [
      { id: "cashFlow", label: "Cash Flow", weight: 0.2, status: "available", score: 80, effectiveWeight: 0.2, signals: [] },
    ],
  };
}

describe("ConfidenceSnapshotCaptureService", () => {
  let repository: FakeConfidenceScoreSnapshotRepository;
  let service: ConfidenceSnapshotCaptureService;
  let ownerId: string;

  beforeEach(() => {
    repository = new FakeConfidenceScoreSnapshotRepository();
    service = new ConfidenceSnapshotCaptureService(repository);
    ownerId = randomUUID();
  });

  it("persists exactly the given result — never recomputes or adjusts it", async () => {
    const result = makeResult(82);
    const snapshot = await service.captureSnapshot(ownerId, "2026-08-07", result, "manual");

    expect(snapshot).not.toBeNull();
    expect(snapshot!.overallScore).toBe(82);
    expect(snapshot!.band).toBe("Stable");
    expect(snapshot!.pillarScores.cashFlow).toBe(80);
    expect(snapshot!.ownerId).toBe(ownerId);
    expect(snapshot!.snapshotType).toBe("manual");
  });

  it("persists a null overall score and band honestly when the result has no evidence", async () => {
    const snapshot = await service.captureSnapshot(ownerId, "2026-08-07", makeResult(null), "manual");
    expect(snapshot!.overallScore).toBeNull();
    expect(snapshot!.band).toBeNull();
  });

  it("is idempotent: a second capture for the same (owner, date) captures nothing new", async () => {
    const first = await service.captureSnapshot(ownerId, "2026-08-07", makeResult(82), "manual");
    const second = await service.captureSnapshot(ownerId, "2026-08-07", makeResult(99), "manual");

    expect(first).not.toBeNull();
    expect(second).toBeNull();

    const stored = await repository.listForOwner(ownerId);
    expect(stored).toHaveLength(1);
    expect(stored[0].overallScore).toBe(82);
  });

  it("allows a second capture for a different date to succeed normally", async () => {
    await service.captureSnapshot(ownerId, "2026-08-07", makeResult(82), "manual");
    const second = await service.captureSnapshot(ownerId, "2026-08-08", makeResult(83), "manual");

    expect(second).not.toBeNull();
    expect(await repository.listForOwner(ownerId)).toHaveLength(2);
  });

  it("is owner-scoped: two owners can capture the same date independently", async () => {
    const otherOwnerId = randomUUID();
    await service.captureSnapshot(ownerId, "2026-08-07", makeResult(82), "manual");
    const otherSnapshot = await service.captureSnapshot(otherOwnerId, "2026-08-07", makeResult(40), "manual");

    expect(otherSnapshot).not.toBeNull();
    expect(await repository.listForOwner(ownerId)).toHaveLength(1);
    expect(await repository.listForOwner(otherOwnerId)).toHaveLength(1);
  });
});
