import "server-only";

import { ConfidenceSnapshotCaptureService } from "@/application/confidence/confidence-snapshot-capture-service";
import { db } from "@/db/client";
import { DrizzleConfidenceScoreSnapshotRepository } from "@/infrastructure/db/confidence-repository";

let confidenceSnapshotCaptureService: ConfidenceSnapshotCaptureService | undefined;

export function getConfidenceSnapshotCaptureService(): ConfidenceSnapshotCaptureService {
  if (!confidenceSnapshotCaptureService) {
    confidenceSnapshotCaptureService = new ConfidenceSnapshotCaptureService(new DrizzleConfidenceScoreSnapshotRepository(db));
  }
  return confidenceSnapshotCaptureService;
}
