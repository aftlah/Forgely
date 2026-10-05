const HTTP_TOO_MANY_REQUESTS = 429;
const MAX_RATE_LIMIT_RETRIES = 3;
/** A longer wait than this means something is badly wrong; fail instead of hanging a request. */
const MAX_RATE_LIMIT_WAIT_MS = 15_000;
const MS_PER_SECOND = 1_000;

/** Discord refused a request. `status` is the HTTP status; `code` is Discord's own error code, if any. */
export class DiscordRestError extends Error {
  constructor(
    readonly status: number,
    readonly code: number | undefined,
    message: string,
  ) {
    super(message);
    this.name = "DiscordRestError";
  }
}

export interface TransportOptions {
  botToken: string;
  apiBaseUrl: string;
  /** Injected so tests need no network. */
  fetchImpl?: typeof fetch;
  /** Injected so tests do not really wait. */
  sleep?: (milliseconds: number) => Promise<void>;
}

export interface DiscordTransport {
  /** Sends one authenticated request. Waits out Discord's rate limits instead of failing on them. */
  request: (method: string, path: string, body?: unknown) => Promise<Response>;
}

const defaultSleep = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function readRetryAfterMs(response: Response): Promise<number | null> {
  try {
    const body = (await response.clone().json()) as { retry_after?: unknown };
    if (typeof body.retry_after === "number") return Math.ceil(body.retry_after * MS_PER_SECOND);
  } catch {
    // fall through to the header
  }
  const header = Number(response.headers.get("retry-after"));
  return Number.isFinite(header) && header > 0 ? Math.ceil(header * MS_PER_SECOND) : null;
}

export async function readErrorCode(response: Response): Promise<number | undefined> {
  try {
    const body: unknown = await response.clone().json();
    const code = (body as { code?: unknown } | null)?.code;
    return typeof code === "number" ? code : undefined;
  } catch {
    return undefined;
  }
}

/** The one place that talks to Discord's REST API as the bot, including rate-limit handling. */
export function createTransport({
  botToken,
  apiBaseUrl,
  fetchImpl = fetch,
  sleep = defaultSleep,
}: TransportOptions): DiscordTransport {
  const send = (method: string, path: string, body?: unknown): Promise<Response> =>
    fetchImpl(`${apiBaseUrl}${path}`, {
      method,
      headers: { authorization: `Bot ${botToken}`, "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });

  return {
    async request(method, path, body) {
      let response = await send(method, path, body);
      for (let retry = 0; retry < MAX_RATE_LIMIT_RETRIES; retry += 1) {
        if (response.status !== HTTP_TOO_MANY_REQUESTS) break;
        const waitMs = await readRetryAfterMs(response);
        if (waitMs === null || waitMs > MAX_RATE_LIMIT_WAIT_MS) break;
        await sleep(waitMs);
        response = await send(method, path, body);
      }
      return response;
    },
  };
}

/** Turns a non-OK response into a typed error that keeps Discord's error code. */
export async function toRestError(response: Response, what: string): Promise<DiscordRestError> {
  return new DiscordRestError(
    response.status,
    await readErrorCode(response),
    `${what} failed with ${response.status}`,
  );
}
