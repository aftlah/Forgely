import type { SaveModuleSettingsInput, StoredModuleConfig } from "@forgely/db";
import {
  TICKETS_MODULE_ID,
  ticketsConfigSchema,
  ticketsModuleConfig,
  type TicketsConfig,
} from "@forgely/shared";

import { buildTicketPanelMessage } from "./build-ticket-panel-message";

import { explainDiscordError, postOrEditMessage, type PostedMessage } from "@/lib/discord-publish";
import type { DiscordRest } from "@/lib/discord-rest";

export interface PublishTicketDependencies {
  findStored: (guildId: string, moduleId: string) => Promise<StoredModuleConfig | undefined>;
  saveWithAudit: (input: SaveModuleSettingsInput) => Promise<void>;
  discord: DiscordRest;
}

export interface PublishTicketRequest {
  guildId: string;
  actorId: string;
}

export type PublishTicketResult =
  /** `config` is what is now saved, so the form can show the posted message without a reload. */
  | { ok: true; posted: "created" | "updated"; config: TicketsConfig }
  | { ok: false; message: string };

const fail = (message: string): PublishTicketResult => ({ ok: false, message });

/** What would stop the panel from being posted, or null if it is ready. */
function findProblem(config: TicketsConfig): string | null {
  if (!config.panel.channelId) return "Choose a channel for the panel and save first.";
  if (!config.categoryId) {
    return "Choose a category for new tickets first. Without one the button can't open anything.";
  }
  return null;
}

/**
 * Posts the saved ticket panel, or edits the message that is already there. It works from what is SAVED,
 * never from what the browser claims. A newly created message's ID is written back, so the next post
 * edits it instead of adding another.
 */
export async function publishTicketPanel(
  deps: PublishTicketDependencies,
  request: PublishTicketRequest,
): Promise<PublishTicketResult> {
  const stored = await deps.findStored(request.guildId, TICKETS_MODULE_ID);
  const parsed = ticketsConfigSchema.safeParse(stored?.config);
  if (!stored || !parsed.success) return fail("Save the settings first, then post the panel.");

  const config = parsed.data;
  const channelId = config.panel.channelId;
  const problem = findProblem(config);
  if (problem || !channelId) return fail(problem ?? "Choose a channel and save first.");

  let outcome: PostedMessage;
  try {
    outcome = await postOrEditMessage(deps.discord, {
      channelId,
      previous: config.panel.message,
      payload: buildTicketPanelMessage(config.panel),
    });
  } catch (error) {
    return fail(explainDiscordError(error));
  }

  const next: TicketsConfig = {
    ...config,
    panel: { ...config.panel, message: { channelId, messageId: outcome.messageId } },
  };
  if (outcome.posted === "created") {
    await deps.saveWithAudit({
      guildId: request.guildId,
      moduleId: TICKETS_MODULE_ID,
      actorId: request.actorId,
      isEnabled: stored.isEnabled,
      configVersion: ticketsModuleConfig.version,
      config: next,
    });
  }
  return { ok: true, posted: outcome.posted, config: next };
}
