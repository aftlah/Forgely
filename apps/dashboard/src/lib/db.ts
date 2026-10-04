import { createDatabase, type Database } from "@forgely/db";

import { getServerEnv } from "./env";

/**
 * One connection pool per server process. In development Next reloads modules often, so the pool
 * is kept on `globalThis` to avoid opening a new one on every change.
 */
const globalForDatabase = globalThis as unknown as { forgelyDatabase?: Database };

export function getDatabase(): Database {
  globalForDatabase.forgelyDatabase ??= createDatabase(getServerEnv().DATABASE_URL).db;
  return globalForDatabase.forgelyDatabase;
}
