import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

export type Database = ReturnType<typeof drizzle<typeof schema>>;

export interface DatabaseConnection {
  db: Database;
  /** Closes the connection pool. Call during graceful shutdown. */
  close: () => Promise<void>;
}

export function createDatabase(databaseUrl: string): DatabaseConnection {
  const client = postgres(databaseUrl);
  return {
    db: drizzle(client, { schema }),
    close: () => client.end(),
  };
}
