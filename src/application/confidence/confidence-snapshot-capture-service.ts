import type { ConfidenceResult } from "./confidence-calculations";
import { toPillarScoresRecord } from "./confidence-history-calculations";
import type { ConfidenceScoreSnapshotRepository } from "@/domains/confidence/repository";
import type { ConfidenceScoreSnapshot, ConfidenceScoreSnapshotType } from "@/domains/confidence/types";

// Real capture path (mirrors SnapshotCaptureService for Net Worth) — no
// scheduler/background-job infrastructure exists in this codebase yet, so
// nothing here invents one. Deliberately takes an ALREADY-COMPUTED
// ConfidenceResult rather than computing one itself: unlike Net Worth's
// capture (which only ever needs the account repository), a Confidence
// Score depends on Accounts, Transactions, Budgets, Goals, and Net Worth
// all at once — that cross-domain orchestration lives at the composition
// layer (confidence-query.ts's computeCurrentConfidenceScore), which this
// class must not depend on (composition depends on application, never the
// reverse). This class's only job is "given a real computed result,
// persist it idempotently" — it never fabricates or adjusts the score it's
// given.
export class ConfidenceSnapshotCaptureService {
  constructor(private readonly snapshotRepository: ConfidenceScoreSnapshotRepository) {}

  async captureSnapshot(
    ownerId: string,
    snapshotDate: string,
    result: ConfidenceResult,
    snapshotType: ConfidenceScoreSnapshotType,
  ): Promise<ConfidenceScoreSnapshot | null> {
    return this.snapshotRepository.create({
      ownerId,
      snapshotDate,
      overallScore: result.overallScore,
      band: result.band?.label ?? null,
      pillarScores: toPillarScoresRecord(result),
      snapshotType,
    });
  }
}
