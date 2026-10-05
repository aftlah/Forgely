import { createTransport, DiscordRestError, toRestError } from "./discord-transport";
import { getSettingsEnv } from "./env";

export { DiscordRestError };

const HTTP_NOT_FOUND = 404;

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
  /** Injected so tests do not really wait out a rate limit. */
  sleep?: (milliseconds: number) => Promise<void>;
}

/** Message calls the dashboard makes, authenticated as the bot. */
export function createDiscordRest(options: RestOptions): DiscordRest {
  const transport = createTransport(options);

  return {
    async postMessage(channelId, payload) {
      const response = await transport.request("POST", `/channels/${channelId}/messages`, payload);
      if (!response.ok) throw await toRestError(response, "Posting a message");

      const body = (await response.json()) as { id?: unknown };
      if (typeof body.id !== "string")
        throw new DiscordRestError(response.status, undefined, "Discord returned no message id");
      return { id: body.id };
    },

    async editMessage(channelId, messageId, payload) {
      const response = await transport.request(
        "PATCH",
        `/channels/${channelId}/messages/${messageId}`,
        payload,
      );
      if (response.status === HTTP_NOT_FOUND) return "missing";
      if (!response.ok) throw await toRestError(response, "Editing a message");
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
