import "server-only";

import { SnapshotCaptureService } from "@/application/net-worth/snapshot-capture-service";
import { db } from "@/db/client";
import { DrizzleAccountRepository } from "@/infrastructure/db/accounts-repository";
import { DrizzleAccountBalanceSnapshotRepository } from "@/infrastructure/db/net-worth-history-repository";

let snapshotCaptureService: SnapshotCaptureService | undefined;

export function getSnapshotCaptureService(): SnapshotCaptureService {
  if (!snapshotCaptureService) {
    snapshotCaptureService = new SnapshotCaptureService(
      new DrizzleAccountBalanceSnapshotRepository(db),
      new DrizzleAccountRepository(db),
    );
  }
  return snapshotCaptureService;
}
