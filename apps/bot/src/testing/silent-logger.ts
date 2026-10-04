import { pino } from "pino";

import type { Logger } from "../core/logger";

/** A logger that discards everything, for tests. */
export function createSilentLogger(): Logger {
  return pino({ level: "silent" });
}
