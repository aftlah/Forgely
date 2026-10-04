import { pino } from "pino";

import type { BotEnv } from "../config/env";

export type Logger = pino.Logger;

/** Context fields attached to every log line so issues can be traced to a guild and feature. */
export interface LogContext {
  guildId?: string | null;
  userId?: string;
  module?: string;
  command?: string;
}

export function createLogger(env: Pick<BotEnv, "LOG_LEVEL" | "NODE_ENV">): Logger {
  const isDevelopment = env.NODE_ENV === "development";
  return pino({
    level: env.LOG_LEVEL,
    transport: isDevelopment ? { target: "pino-pretty", options: { colorize: true } } : undefined,
  });
}
