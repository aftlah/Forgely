import { DiscordRestError, type DiscordMessagePayload, type DiscordRest } from "./discord-rest";

const HTTP_FORBIDDEN = 403;
const HTTP_NOT_FOUND = 404;

/** Turns a Discord refusal into something an owner can act on. */
export function explainDiscordError(error: unknown): string {
  if (error instanceof DiscordRestError && error.status === HTTP_FORBIDDEN) {
    return "Forgely can't post in that channel. Give it View Channel, Send Messages, and Embed Links there.";
  }
  if (error instanceof DiscordRestError && error.status === HTTP_NOT_FOUND) {
    return "That channel doesn't exist any more. Pick another and save first.";
  }
  return "Discord didn't accept the message. Try again in a moment.";
}

export interface PostedMessage {
  posted: "created" | "updated";
  messageId: string;
}

/**
 * Edits the message that is already posted, or posts a new one. It edits in place only when the old
 * message is in the channel we want now, and starts fresh when it was deleted or the channel changed.
 */
export async function postOrEditMessage(
  discord: DiscordRest,
  input: {
    channelId: string;
    previous: { channelId: string; messageId: string } | null;
    payload: DiscordMessagePayload;
  },
): Promise<PostedMessage> {
  const { channelId, previous, payload } = input;
  if (previous && previous.channelId === channelId) {
    const outcome = await discord.editMessage(channelId, previous.messageId, payload);
    if (outcome === "edited") return { posted: "updated", messageId: previous.messageId };
  }
  const created = await discord.postMessage(channelId, payload);
  return { posted: "created", messageId: created.id };
}
