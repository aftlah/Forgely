import type { SaveModuleSettingsInput, StoredModuleConfig } from "@forgely/db";
import {
  ROLE_PANELS_MODULE_ID,
  rolePanelsConfigSchema,
  rolePanelsModuleConfig,
  type RolePanel,
  type RolePanelsConfig,
} from "@forgely/shared";

import { buildPanelMessage } from "./build-panel-message";

import { DiscordRestError, type DiscordRest } from "@/lib/discord-rest";

export interface PublishDependencies {
  findStored: (guildId: string, moduleId: string) => Promise<StoredModuleConfig | undefined>;
  saveWithAudit: (input: SaveModuleSettingsInput) => Promise<void>;
  discord: DiscordRest;
}

export interface PublishRequest {
  guildId: string;
  panelId: string;
  actorId: string;
}

export type PublishResult =
  /** `config` is what is now saved, so the form can show the posted message without a reload. */
  | { ok: true; posted: "created" | "updated"; config: RolePanelsConfig }
  | { ok: false; message: string };

const HTTP_FORBIDDEN = 403;
const HTTP_NOT_FOUND = 404;

const fail = (message: string): PublishResult => ({ ok: false, message });

/** Turns a Discord refusal into something an owner can act on. */
function explainDiscordError(error: unknown): string {
  if (error instanceof DiscordRestError && error.status === HTTP_FORBIDDEN) {
    return "Forgely can't post in that channel. Give it View Channel, Send Messages, and Embed Links there.";
  }
  if (error instanceof DiscordRestError && error.status === HTTP_NOT_FOUND) {
    return "That channel doesn't exist any more. Pick another and save first.";
  }
  return "Discord didn't accept the message. Try again in a moment.";
}

/** What would stop this panel from being posted, or null if it is ready. */
function findProblem(panel: RolePanel): string | null {
  if (!panel.channelId) return "Choose a channel for this panel and save first.";
  if (panel.buttons.length === 0) return "Add at least one button and save first.";
  return null;
}

/** Posts the saved panel to Discord, or edits the message that is already there. */
async function sendPanel(
  discord: DiscordRest,
  panel: RolePanel,
  channelId: string,
): Promise<{ posted: "created" | "updated"; messageId: string }> {
  const payload = buildPanelMessage(panel);

  // Edit in place only if the old message is in the channel we want now; otherwise start fresh.
  if (panel.message && panel.message.channelId === channelId) {
    const outcome = await discord.editMessage(channelId, panel.message.messageId, payload);
    if (outcome === "edited") return { posted: "updated", messageId: panel.message.messageId };
  }
  const created = await discord.postMessage(channelId, payload);
  return { posted: "created", messageId: created.id };
}

/**
 * Posts one saved panel to its channel. It works from what is SAVED, never from what the browser
 * claims, so a panel that was never saved (or was edited in another tab) cannot be posted by accident.
 * When a new message is created, its ID is written back so the next click edits it instead of posting again.
 */
export async function publishRolePanel(
  deps: PublishDependencies,
  request: PublishRequest,
): Promise<PublishResult> {
  const stored = await deps.findStored(request.guildId, ROLE_PANELS_MODULE_ID);
  const parsed = rolePanelsConfigSchema.safeParse(stored?.config);
  const panel = parsed.success
    ? parsed.data.panels.find((candidate) => candidate.id === request.panelId)
    : undefined;
  if (!stored || !parsed.success || !panel) return fail("Save this panel first, then post it.");

  const problem = findProblem(panel);
  if (problem || !panel.channelId)
    return fail(problem ?? "Choose a channel for this panel and save first.");

  let outcome: Awaited<ReturnType<typeof sendPanel>>;
  try {
    outcome = await sendPanel(deps.discord, panel, panel.channelId);
  } catch (error) {
    return fail(explainDiscordError(error));
  }

  const channelId = panel.channelId;
  const config: RolePanelsConfig = {
    panels: parsed.data.panels.map((candidate) =>
      candidate.id === panel.id
        ? { ...candidate, message: { channelId, messageId: outcome.messageId } }
        : candidate,
    ),
  };
  if (outcome.posted === "created") {
    await deps.saveWithAudit({
      guildId: request.guildId,
      moduleId: ROLE_PANELS_MODULE_ID,
      actorId: request.actorId,
      isEnabled: stored.isEnabled,
      configVersion: rolePanelsModuleConfig.version,
      config,
    });
  }
  return { ok: true, posted: outcome.posted, config };
}
