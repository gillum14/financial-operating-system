import type { DbClient } from "@/db/client";

class RollbackForTest extends Error {}

// Runs `run` inside a transaction that always rolls back, regardless of
// outcome — lets integration tests exercise real writes against a real
// database without leaving anything behind afterward.
export async function withRollback<T>(db: DbClient, run: (tx: DbClient) => Promise<T>): Promise<T> {
  let result: T | undefined;

  await db
    .transaction(async (tx) => {
      result = await run(tx);
      throw new RollbackForTest();
    })
    .catch((error: unknown) => {
      if (!(error instanceof RollbackForTest)) {
        throw error;
      }
    });

  return result as T;
}
