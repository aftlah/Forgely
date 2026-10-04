import { MessageFlags, type RepliableInteraction } from "discord.js";
import { describe, expect, it, vi } from "vitest";

import { PermissionError } from "@forgely/shared";

import { createSilentLogger } from "../testing/silent-logger";

import { handleCommandError, toUserMessage } from "./error-handler";

vi.mock("@sentry/node", () => ({ captureException: vi.fn() }));

function createInteraction(state: { replied?: boolean; deferred?: boolean } = {}) {
  return {
    replied: state.replied ?? false,
    deferred: state.deferred ?? false,
    reply: vi.fn(async () => undefined),
    followUp: vi.fn(async () => undefined),
  };
}

describe("toUserMessage", () => {
  it("shows the safe message of expected errors", () => {
    expect(toUserMessage(new PermissionError("internal detail", "Nope."))).toBe("Nope.");
  });

  it("hides the details of unexpected errors", () => {
    const message = toUserMessage(new Error("db password is hunter2"));
    expect(message).not.toMatch(/hunter2/);
    expect(message).toMatch(/went wrong/);
  });
});

describe("handleCommandError", () => {
  it("replies ephemerally when the interaction is unanswered", async () => {
    const interaction = createInteraction();

    await handleCommandError(
      interaction as unknown as RepliableInteraction,
      new PermissionError("x", "Nope."),
      createSilentLogger(),
    );

    expect(interaction.reply).toHaveBeenCalledWith({
      content: "Nope.",
      flags: MessageFlags.Ephemeral,
    });
  });

  it("follows up when the interaction was already deferred", async () => {
    const interaction = createInteraction({ deferred: true });

    await handleCommandError(
      interaction as unknown as RepliableInteraction,
      new Error("boom"),
      createSilentLogger(),
    );

    expect(interaction.followUp).toHaveBeenCalledOnce();
    expect(interaction.reply).not.toHaveBeenCalled();
  });

  it("does not throw if the error reply itself fails", async () => {
    const interaction = createInteraction();
    interaction.reply.mockRejectedValueOnce(new Error("interaction expired"));

    await expect(
      handleCommandError(
        interaction as unknown as RepliableInteraction,
        new Error("boom"),
        createSilentLogger(),
      ),
    ).resolves.toBeUndefined();
  });
});
