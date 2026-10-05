import type { z } from "zod";

import type { SaveModuleSettingsInput, StoredModuleConfig } from "@forgely/db";
import { isConfigurableModuleId, MODULE_CONFIGS, type ConfigurableModuleId } from "@forgely/shared";

import type { GuildResources } from "./guild-resources";
import { getConfigReferences, type ConfigReferences } from "./module-references";

import type { Delivery, PublishConfigUpdate } from "@/lib/config-publisher";

export interface SaveDependencies {
  findStored: (guildId: string, moduleId: string) => Promise<StoredModuleConfig | undefined>;
  saveWithAudit: (input: SaveModuleSettingsInput) => Promise<void>;
  /** Null when Discord could not be reached. */
  loadResources: (guildId: string) => Promise<GuildResources | null>;
  publish: PublishConfigUpdate;
}

/** What the browser sent. Everything here is untrusted until validated. */
export interface SaveRequest {
  guildId: string;
  moduleId: string;
  actorId: string;
  isEnabled: unknown;
  config: unknown;
}

export type SaveFailureReason = "unknown-module" | "invalid" | "unknown-reference" | "unverifiable";

export type SaveResult =
  | { ok: true; delivery: Delivery }
  | { ok: false; reason: SaveFailureReason; message: string; fieldErrors: Record<string, string> };

function failure(
  reason: SaveFailureReason,
  message: string,
  fieldErrors: Record<string, string> = {},
): SaveResult {
  return { ok: false, reason, message, fieldErrors };
}

/** Maps Zod issues to `{ "welcome.message": "..." }` so the form can show each error by its field. */
function toFieldErrors(issues: z.core.$ZodIssue[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.join(".");
    errors[key] ??= issue.message;
  }
  return errors;
}

/**
 * Checks every channel and role the settings point at against the real server. A role the bot
 * cannot assign is refused unless it was already saved, so an old choice never blocks an unrelated edit.
 */
function findReferenceProblem(
  references: ConfigReferences,
  previous: ConfigReferences,
  resources: GuildResources,
): string | null {
  const knownChannels = new Set(resources.channels.map((channel) => channel.id));
  if (references.channelIds.some((id) => !knownChannels.has(id))) {
    return "One of the chosen channels doesn't exist in this server any more. Reload the page and pick again.";
  }

  const knownCategories = new Set(resources.categories.map((category) => category.id));
  if ((references.categoryIds ?? []).some((id) => !knownCategories.has(id))) {
    return "The chosen category doesn't exist in this server any more. Reload the page and pick again.";
  }

  const rolesById = new Map(resources.roles.map((role) => [role.id, role]));
  const missingRole = (references.existingRoleIds ?? []).some((id) => !rolesById.has(id));
  if (missingRole) {
    return "One of the chosen roles doesn't exist in this server any more. Reload the page and pick again.";
  }
  for (const id of references.roleIds) {
    const role = rolesById.get(id);
    if (!role)
      return "One of the chosen roles doesn't exist in this server any more. Reload the page and pick again.";
    if (!role.isAssignable && !previous.roleIds.includes(id)) {
      return `Forgely can't give the "${role.name}" role. Move the Forgely role above it in Server Settings, or pick another role.`;
    }
  }
  return null;
}

/** Without Discord we can only accept references that were already saved. */
function findUnverifiableReference(
  references: ConfigReferences,
  previous: ConfigReferences,
): boolean {
  const isNew = (id: string, known: string[]): boolean => !known.includes(id);
  return (
    references.channelIds.some((id) => isNew(id, previous.channelIds)) ||
    references.roleIds.some((id) => isNew(id, previous.roleIds)) ||
    (references.categoryIds ?? []).some((id) => isNew(id, previous.categoryIds ?? [])) ||
    (references.existingRoleIds ?? []).some((id) => isNew(id, previous.existingRoleIds ?? []))
  );
}

/** Returns a failure if the settings point at channels or roles that are not in the server, else null. */
async function checkReferences(
  deps: SaveDependencies,
  guildId: string,
  moduleId: ConfigurableModuleId,
  config: unknown,
): Promise<SaveResult | null> {
  const references = getConfigReferences(moduleId, config);
  const stored = await deps.findStored(guildId, moduleId);
  const previous = getConfigReferences(moduleId, stored?.config);
  const resources = await deps.loadResources(guildId);

  if (resources) {
    const problem = findReferenceProblem(references, previous, resources);
    return problem ? failure("unknown-reference", problem) : null;
  }
  if (findUnverifiableReference(references, previous)) {
    return failure(
      "unverifiable",
      "Couldn't check those channels and roles with Discord just now. Try again in a moment.",
    );
  }
  return null;
}

/**
 * Validates and stores one module's settings, then tells the bot. Validation uses the same Zod schema
 * the bot reads with, so the dashboard can never store something the bot would reject.
 * Errors from the database are not caught here: a failed save must surface, not look like success.
 */
export async function saveModuleSettings(
  deps: SaveDependencies,
  request: SaveRequest,
): Promise<SaveResult> {
  const { guildId, moduleId, actorId } = request;
  if (!isConfigurableModuleId(moduleId))
    return failure("unknown-module", "That module doesn't have settings.");
  if (typeof request.isEnabled !== "boolean")
    return failure("invalid", "Switch the module on or off and try again.");

  const definition = MODULE_CONFIGS[moduleId];
  const parsed = definition.schema.safeParse(request.config);
  if (!parsed.success) {
    return failure(
      "invalid",
      "Some settings aren't valid. Check the highlighted fields.",
      toFieldErrors(parsed.error.issues),
    );
  }

  const referenceFailure = await checkReferences(deps, guildId, moduleId, parsed.data);
  if (referenceFailure) return referenceFailure;

  await deps.saveWithAudit({
    guildId,
    moduleId,
    actorId,
    isEnabled: request.isEnabled,
    configVersion: definition.version,
    // The parsed copy: unknown keys sent by the browser are dropped.
    config: parsed.data,
  });

  return { ok: true, delivery: await deps.publish(guildId, moduleId) };
}
