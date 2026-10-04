import { MessageFlags, type ChatInputCommandInteraction } from "discord.js";
import { describe, expect, it, vi } from "vitest";

import { deferPrivately, replyPrivately } from "./command-context";

function createInteraction(deferred: boolean) {
  return {
    deferred,
    deferReply: vi.fn(async () => undefined),
    editReply: vi.fn(async () => undefined),
    reply: vi.fn(async () => undefined),
  };
}

function asInteraction(fake: ReturnType<typeof createInteraction>): ChatInputCommandInteraction {
  return fake as unknown as ChatInputCommandInteraction;
}

describe("deferPrivately", () => {
  it("acknowledges the command so only the moderator sees the result", async () => {
    const interaction = createInteraction(false);

    await deferPrivately(asInteraction(interaction));

    expect(interaction.deferReply).toHaveBeenCalledWith({ flags: MessageFlags.Ephemeral });
  });
});

describe("replyPrivately", () => {
  it("completes the deferred reply instead of replying again", async () => {
    const interaction = createInteraction(true);

    await replyPrivately(asInteraction(interaction), "Done.");

    expect(interaction.editReply).toHaveBeenCalledWith({ content: "Done." });
    expect(interaction.reply).not.toHaveBeenCalled();
  });

  it("replies ephemerally when the command was not deferred", async () => {
    const interaction = createInteraction(false);

    await replyPrivately(asInteraction(interaction), "Done.");

    expect(interaction.reply).toHaveBeenCalledWith({
      content: "Done.",
      flags: MessageFlags.Ephemeral,
    });
  });
});
