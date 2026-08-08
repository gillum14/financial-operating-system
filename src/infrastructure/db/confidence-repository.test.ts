import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { DbClient } from "@/db/client";
import { confidenceScoreSnapshots } from "@/db/schema";

import { DrizzleConfidenceScoreSnapshotRepository } from "./confidence-repository";
import { createTestAuthUser } from "./test-support/create-test-auth-user";
import { createTestDbClient, isDbTestingAllowed } from "./test-support/test-db-client";
import { withRollback } from "./test-support/with-rollback";

// See db-test-guard.ts — requires ALLOW_DB_TESTS=true and a separate
// TEST_DATABASE_URL, never DATABASE_URL. Skipped entirely (and no real
// connection opened) when the guard refuses.
const hasDatabase = isDbTestingAllowed();

describe.skipIf(!hasDatabase)("DrizzleConfidenceScoreSnapshotRepository (integration)", () => {
  let db: DbClient;
  let close: () => Promise<void>;

  beforeAll(() => {
    const client = createTestDbClient();
    db = client.db;
    close = client.close;
  });

  afterAll(async () => {
    await close();
  });

  // Exercises the confidence_score_snapshots_owner_date_idx unique index
  // directly via the repository, bypassing ConfidenceSnapshotCaptureService
  // — proves the database-level idempotency invariant holds on its own.
  it("create() returns null and writes nothing when a snapshot already exists for (ownerId, snapshotDate)", async () => {
    await withRollback(db, async (tx) => {
      const owner = await createTestAuthUser(tx);
      const repository = new DrizzleConfidenceScoreSnapshotRepository(tx);

      const first = await repository.create({
        ownerId: owner.id,
        snapshotDate: "2026-01-31",
        overallScore: 82,
        band: "Strong",
        pillarScores: { cashFlow: 80 },
        snapshotType: "manual",
      });
      expect(first).not.toBeNull();
      expect(first!.overallScore).toBe(82);

      // A second capture for the same (owner, date) — even with a
      // different score — must insert nothing and never overwrite the
      // first row.
      const second = await repository.create({
        ownerId: owner.id,
        snapshotDate: "2026-01-31",
        overallScore: 10,
        band: "At Risk",
        pillarScores: { cashFlow: 5 },
        snapshotType: "manual",
      });
      expect(second).toBeNull();

      const stored = await tx
        .select()
        .from(confidenceScoreSnapshots)
        .where(and(eq(confidenceScoreSnapshots.ownerId, owner.id), eq(confidenceScoreSnapshots.snapshotDate, "2026-01-31")));
      expect(stored).toHaveLength(1);
      expect(stored[0].overallScore).toBe(82);
    });
  });

  it("persists a null overall score and band honestly (no fabricated default)", async () => {
    await withRollback(db, async (tx) => {
      const owner = await createTestAuthUser(tx);
      const repository = new DrizzleConfidenceScoreSnapshotRepository(tx);

      const snapshot = await repository.create({
        ownerId: owner.id,
        snapshotDate: "2026-01-31",
        overallScore: null,
        band: null,
        pillarScores: { cashFlow: null },
        snapshotType: "manual",
      });

      expect(snapshot!.overallScore).toBeNull();
      expect(snapshot!.band).toBeNull();
    });
  });

  it("listForOwner returns every snapshot for this owner, oldest first", async () => {
    await withRollback(db, async (tx) => {
      const owner = await createTestAuthUser(tx);
      const repository = new DrizzleConfidenceScoreSnapshotRepository(tx);

      await repository.create({
        ownerId: owner.id,
        snapshotDate: "2026-02-28",
        overallScore: 85,
        band: "Strong",
        pillarScores: {},
        snapshotType: "manual",
      });
      await repository.create({
        ownerId: owner.id,
        snapshotDate: "2026-01-31",
        overallScore: 80,
        band: "Stable",
        pillarScores: {},
        snapshotType: "manual",
      });

      const history = await repository.listForOwner(owner.id);
      expect(history.map((row) => row.snapshotDate)).toEqual(["2026-01-31", "2026-02-28"]);
    });
  });
});
