import { z } from "zod";

import { createTransport, toRestError } from "./discord-transport";
import type { TransportOptions } from "./discord-transport";
import { getSettingsEnv } from "./env";

/** Discord's numeric codes for AutoMod rules. */
export const AUTOMOD_EVENT_MESSAGE_SEND = 1;
export const AUTOMOD_TRIGGER = { keyword: 1, spam: 3, keywordPreset: 4, mentionSpam: 5 } as const;
export const AUTOMOD_ACTION = { blockMessage: 1, sendAlert: 2, timeout: 3 } as const;
export const AUTOMOD_PRESET = { profanity: 1, sexualContent: 2, slurs: 3 } as const;

const ruleSchema = z.object({
  id: z.string(),
  name: z.string(),
  enabled: z.boolean(),
});

export type ExistingAutomodRule = z.infer<typeof ruleSchema>;

/** What Forgely sends to create or change a rule. */
export interface AutomodRulePayload {
  name: string;
  event_type: number;
  trigger_type: number;
  trigger_metadata?: Record<string, unknown>;
  actions: { type: number; metadata?: Record<string, unknown> }[];
  enabled: boolean;
  exempt_roles: string[];
}

export interface AutomodRest {
  listRules: (guildId: string) => Promise<ExistingAutomodRule[]>;
  createRule: (guildId: string, rule: AutomodRulePayload) => Promise<void>;
  /** The trigger type of an existing rule cannot change, so it is left out of an update. */
  updateRule: (
    guildId: string,
    ruleId: string,
    rule: Omit<AutomodRulePayload, "trigger_type" | "event_type">,
  ) => Promise<void>;
  deleteRule: (guildId: string, ruleId: string) => Promise<void>;
}

async function expectOk(response: Response, what: string): Promise<void> {
  if (!response.ok) throw await toRestError(response, what);
}

/** Discord's AutoMod rule calls, authenticated as the bot. Needs the Manage Server permission. */
export function createAutomodRest(options: TransportOptions): AutomodRest {
  const transport = createTransport(options);
  const base = (guildId: string): string => `/guilds/${guildId}/auto-moderation/rules`;

  return {
    async listRules(guildId) {
      const response = await transport.request("GET", base(guildId));
      if (!response.ok) throw await toRestError(response, "Listing AutoMod rules");
      return z.array(ruleSchema).parse(await response.json());
    },
    async createRule(guildId, rule) {
      await expectOk(
        await transport.request("POST", base(guildId), rule),
        "Creating an AutoMod rule",
      );
    },
    async updateRule(guildId, ruleId, rule) {
      const path = `${base(guildId)}/${ruleId}`;
      await expectOk(await transport.request("PATCH", path, rule), "Updating an AutoMod rule");
    },
    async deleteRule(guildId, ruleId) {
      const path = `${base(guildId)}/${ruleId}`;
      await expectOk(await transport.request("DELETE", path), "Deleting an AutoMod rule");
    },
  };
}

export function getAutomodRest(): AutomodRest {
  const env = getSettingsEnv();
  return createAutomodRest({
    botToken: env.DISCORD_BOT_TOKEN,
    apiBaseUrl: env.DISCORD_API_BASE_URL,
  });
}
