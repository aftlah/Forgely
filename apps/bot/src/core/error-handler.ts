import * as Sentry from "@sentry/node";
import { MessageFlags, type RepliableInteraction } from "discord.js";

import { ForgelyError } from "@forgely/shared";

import type { Logger } from "./logger";

const UNEXPECTED_ERROR_MESSAGE = "Something went wrong on my side. Please try again in a moment.";

/** Converts any thrown value into text that is safe to show in Discord. */
export function toUserMessage(error: unknown): string {
  return error instanceof ForgelyError ? error.userMessage : UNEXPECTED_ERROR_MESSAGE;
}

async function replyEphemeral(interaction: RepliableInteraction, content: string): Promise<void> {
  const alreadyAnswered = interaction.replied || interaction.deferred;
  if (alreadyAnswered) {
    await interaction.followUp({ content, flags: MessageFlags.Ephemeral });
    return;
  }
  await interaction.reply({ content, flags: MessageFlags.Ephemeral });
}

/**
 * The single place where a failed command becomes a user reply and a log entry.
 * Expected errors (`ForgelyError`) are logged as warnings; anything else is an
 * unexpected bug, so it is logged as an error and reported to Sentry.
 */
export async function handleCommandError(
  interaction: RepliableInteraction,
  error: unknown,
  logger: Logger,
): Promise<void> {
  if (error instanceof ForgelyError) {
    logger.warn({ err: error, code: error.code }, "Command rejected");
  } else {
    logger.error({ err: error }, "Command failed unexpectedly");
    Sentry.captureException(error);
  }

  try {
    await replyEphemeral(interaction, toUserMessage(error));
  } catch (replyError) {
    // The interaction may have expired. Log it; there is nobody left to tell.
    logger.error({ err: replyError }, "Could not send error reply");
  }
}

/** Logs and reports a failure from a non-interaction handler such as a gateway event. */
export function handleEventError(error: unknown, logger: Logger): void {
  logger.error({ err: error }, "Event handler failed");
  Sentry.captureException(error);
}
