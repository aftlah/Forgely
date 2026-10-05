import type { SaveModuleSettingsInput, StoredModuleConfig } from "@forgely/db";
import {
  ROLE_PANELS_MODULE_ID,
  rolePanelsConfigSchema,
  rolePanelsModuleConfig,
  type RolePanel,
  type RolePanelsConfig,
} from "@forgely/shared";

import { buildPanelMessage } from "./build-panel-message";

import { explainDiscordError, postOrEditMessage, type PostedMessage } from "@/lib/discord-publish";
import type { DiscordRest } from "@/lib/discord-rest";

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

const fail = (message: string): PublishResult => ({ ok: false, message });

/** What would stop this panel from being posted, or null if it is ready. */
function findProblem(panel: RolePanel): string | null {
  if (!panel.channelId) return "Choose a channel for this panel and save first.";
  if (panel.buttons.length === 0) return "Add at least one button and save first.";
  return null;
}

/** The config with the posted message's reference stored on that one panel. */
function withMessage(
  config: RolePanelsConfig,
  panel: RolePanel,
  message: { channelId: string; messageId: string },
): RolePanelsConfig {
  return {
    panels: config.panels.map((candidate) =>
      candidate.id === panel.id ? { ...candidate, message } : candidate,
    ),
  };
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

  let outcome: PostedMessage;
  try {
    outcome = await postOrEditMessage(deps.discord, {
      channelId: panel.channelId,
      previous: panel.message,
      payload: buildPanelMessage(panel),
    });
  } catch (error) {
    return fail(explainDiscordError(error));
  }

  const config = withMessage(parsed.data, panel, {
    channelId: panel.channelId,
    messageId: outcome.messageId,
  });
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
