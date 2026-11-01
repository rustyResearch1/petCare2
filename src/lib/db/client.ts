import "server-only";
import { connect, schema, type DB } from "./connect";

declare global {
  // eslint-disable-next-line no-var
  var __settledDb: Promise<DB> | undefined;
}

/** Lazily connects once per server process; runs the idempotent migration and first-boot seed. */
export function getDb(): Promise<DB> {
  globalThis.__settledDb ??= connect().catch((e) => {
    globalThis.__settledDb = undefined;
    throw e;
  });
  return globalThis.__settledDb;
}

export { schema };
export type { DB };
