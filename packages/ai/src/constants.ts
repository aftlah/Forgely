/** Overload and rate limits clear up on their own, so they are worth retrying. */
export const RETRIABLE_STATUSES: ReadonlySet<number> = new Set([429, 500, 502, 503, 504]);
export const MODEL_MISSING_STATUS = 404;
