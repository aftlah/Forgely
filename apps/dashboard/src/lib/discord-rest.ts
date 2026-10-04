import { getSettingsEnv } from "./env";

const HTTP_NOT_FOUND = 404;

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

export interface DiscordMessagePayload {
  embeds?: unknown[];
  components?: unknown[];
  allowed_mentions?: { parse: string[] };
}

export interface DiscordRest {
  postMessage: (channelId: string, payload: DiscordMessagePayload) => Promise<{ id: string }>;
  /** "missing" means the message was deleted in Discord, so the caller can post a new one. */
  editMessage: (
    channelId: string,
    messageId: string,
    payload: DiscordMessagePayload,
  ) => Promise<"edited" | "missing">;
}

interface RestOptions {
  botToken: string;
  apiBaseUrl: string;
  /** Injected so tests need no network. */
  fetchImpl?: typeof fetch;
}

async function readErrorCode(response: Response): Promise<number | undefined> {
  try {
    const body: unknown = await response.json();
    const code = (body as { code?: unknown } | null)?.code;
    return typeof code === "number" ? code : undefined;
  } catch {
    return undefined;
  }
}

/** The few Discord REST calls the dashboard makes, authenticated as the bot. */
export function createDiscordRest({
  botToken,
  apiBaseUrl,
  fetchImpl = fetch,
}: RestOptions): DiscordRest {
  async function send(
    method: string,
    path: string,
    payload: DiscordMessagePayload,
  ): Promise<Response> {
    return fetchImpl(`${apiBaseUrl}${path}`, {
      method,
      headers: { authorization: `Bot ${botToken}`, "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  async function failure(response: Response, what: string): Promise<DiscordRestError> {
    return new DiscordRestError(
      response.status,
      await readErrorCode(response),
      `${what} failed with ${response.status}`,
    );
  }

  return {
    async postMessage(channelId, payload) {
      const response = await send("POST", `/channels/${channelId}/messages`, payload);
      if (!response.ok) throw await failure(response, "Posting a message");

      const body = (await response.json()) as { id?: unknown };
      if (typeof body.id !== "string")
        throw new DiscordRestError(response.status, undefined, "Discord returned no message id");
      return { id: body.id };
    },

    async editMessage(channelId, messageId, payload) {
      const response = await send("PATCH", `/channels/${channelId}/messages/${messageId}`, payload);
      if (response.status === HTTP_NOT_FOUND) return "missing";
      if (!response.ok) throw await failure(response, "Editing a message");
      return "edited";
    },
  };
}

/** The real client, authenticated with the bot token from the environment. */
export function getDiscordRest(): DiscordRest {
  const env = getSettingsEnv();
  return createDiscordRest({
    botToken: env.DISCORD_BOT_TOKEN,
    apiBaseUrl: env.DISCORD_API_BASE_URL,
  });
}
