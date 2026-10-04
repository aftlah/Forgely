type LogContext = Record<string, string | number | boolean | null | undefined>;

/**
 * One JSON line to stderr. The dashboard has no logging library yet; this keeps failures visible
 * and machine-readable without pulling one in. Never pass secrets or tokens as context.
 */
export function logWarning(message: string, context: LogContext = {}): void {
  process.stderr.write(
    `${JSON.stringify({ level: "warn", time: new Date().toISOString(), message, ...context })}\n`,
  );
}

/** Turns anything thrown into a short, safe string for a log line. */
export function describeError(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}
